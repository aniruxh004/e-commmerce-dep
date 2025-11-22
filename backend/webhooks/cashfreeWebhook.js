const Cart = require("../models/Cart");
const PendingOrder = require("../models/PendingOrder")
const Order = require("../models/Orders")
const Products=require("../models/products")
const mongoose = require('mongoose');


module.exports = async (req, res) => {
  // parse raw body (express.raw middleware used at route)
  let payload;
  try {
    payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
  } catch (err) {
    console.error('Malformed webhook payload:', err);
    return res.status(400).send('bad payload');
  }

  console.log('Cashfree payload:', payload);

  const event = payload.type;
  const cfOrderId = payload.data?.order?.order_id || payload.order_id || payload.orderId || null;

  if (!cfOrderId) {
    console.warn('Webhook missing order id', payload);
    return res.status(400).json({ msg: 'missing order id' });
  }

  try {
    // 0) Quick idempotency: if final order already exists, nothing to do
    const existingFinal = await Order.findOne({ cashfreeOrderId: cfOrderId });
    if (existingFinal) {
      console.info(`Order ${cfOrderId} already exists — skipping webhook`);
      // clean up any stale pending
      await PendingOrder.deleteOne({ cashfreeOrderId: cfOrderId }).catch(()=>{});
      return res.status(200).send('ok');
    }

    // 1) Find matching pending order
    const pending = await PendingOrder.findOne({ cashfreeOrderId: cfOrderId });
    if (!pending) {
      console.warn('No matching pending order for', cfOrderId);
      return res.status(200).send('ok'); // ack — provider should not retry forever
    }

    // 2) Only handle PAYMENT_SUCCESS_WEBHOOK and PAYMENT_FAILED_WEBHOOK
    if (event === 'PAYMENT_SUCCESS_WEBHOOK') {
      // Atomically acquire the work (only one process/webhook will succeed)
      // Set paymentStatus -> 'processing' only if currently 'pending'
      const locked = await PendingOrder.findOneAndUpdate(
        { cashfreeOrderId: cfOrderId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'processing', processingStartedAt: new Date(), lastWebhookPayload: payload } },
        { new: true }
      );

      if (!locked) {
        // another worker/webhook already processing or finished
        console.info(`PendingOrder ${cfOrderId} already being processed or finished. Skipping.`);
        return res.status(200).send('ok');
      }

      // Try to run the critical section in a transaction if available
      const session = await mongoose.startSession();
      let inTransaction = false;
      try {
        // Only run a transaction if the server supports it (replica set)
        await session.withTransaction(async () => {
          inTransaction = true;

          // 3) Reduce stock atomically with guarded updates
          for (const item of locked.Items) {
            const qty = Number(item.quantity || 0);
            if (qty <= 0) continue;

            const upd = await Products.updateOne(
              { _id: item.productId, stock: { $gte: qty } }, // ensure enough stock
              { $inc: { stock: -qty } },
              { session }
            );

            if (upd.matchedCount === 0) {
              // insufficient stock or product missing => abort transaction
              throw new Error(`Insufficient stock for product ${item.productId}`);
            }
          }

          // 4) Create final Order document
          const newOrder = new Order({
            userId: locked.userId,
            Items: locked.Items,
            shippingAddress: locked.shippingAddress,
            totalAmount: locked.totalAmount,
            paymentStatus: 'paid',
            cashfreeOrderId: cfOrderId,
            webhookPayload: payload,
            createdAt: new Date()
          });

          await newOrder.save({ session });

          // 5) Delete cart and pending order (cleanup)
          await Cart.deleteOne({ userId: locked.userId }, { session }).catch(() => {});
          await PendingOrder.deleteOne({ cashfreeOrderId: cfOrderId }, { session });

        }, {
          // optional transaction options
          readConcern: { level: 'local' },
          writeConcern: { w: 'majority' }
        });

        // If we reach here, transaction committed
        console.info(`Order ${cfOrderId} processed successfully (transaction commit).`);
        return res.status(200).send('ok');

      } catch (txErr) {
        // Transaction aborted — log and try safe rollback: set pending to failed (outside txn)
        console.error('Transaction failed while processing webhook:', txErr);

        // If transaction aborted, the DB changes in transaction are rolled back automatically.
        // We should mark the pending order as 'failed' or 'pending' for manual inspection.
        try {
          await PendingOrder.updateOne(
            { cashfreeOrderId: cfOrderId },
            {
              $set: {
                paymentStatus: 'failed',
                lastWebhookError: txErr.message,
                lastWebhookPayload: payload,
                processingStartedAt: null
              }
            }
          );
        } catch (uerr) {
          console.error('Failed to mark pending order failed after tx abort:', uerr);
        }

        return res.status(200).send('ok'); // ack so provider does not keep retrying aggressively
      } finally {
        session.endSession();
      }
    }

    else if (event === 'PAYMENT_FAILED_WEBHOOK') {
      // Mark pending order as failed (atomic)
      await PendingOrder.findOneAndUpdate(
        { cashfreeOrderId: cfOrderId, paymentStatus: { $in: ['pending', 'processing'] } },
        { $set: { paymentStatus: 'failed', lastWebhookPayload: payload } }
      );
      console.info(`Pending order ${cfOrderId} marked failed via webhook.`);
      return res.status(200).send('ok');
    }

    // Unhandled event — acknowledge
    console.log('Unhandled event:', event);
    return res.status(200).send('ok');

  } catch (error) {
    // If duplicate key / concurrency error occurs, treat it as success (idempotent)
    if (error && error.code === 11000) {
      console.warn(`[DUPLICATE IGNORED] Concurrent processing attempted for order ${cfOrderId}`);
      return res.status(200).send('ok');
    }

    // Log other errors — return 500 if you want the provider to retry, otherwise 200 to ack.
    console.error('CRITICAL WEBHOOK PROCESSING ERROR:', error);
    // Return 500 so provider may retry — choose 200 if you prefer to avoid retries.
    return res.status(500).send('server error');
  }
};


// module.exports = async (req, res) => {
//   try {
//     const payload = Buffer.isBuffer(req.body)
//       ? JSON.parse(req.body.toString())
//       : req.body;

//     console.log("Cashfree payload:", payload);

//     const event = payload.type;

//     const cfOrderId = payload.data?.order?.order_id;

//     if (!cfOrderId) {
//       return res.status(400).json({ msg: "missing order id" })
//     }

//     const finalOrder=await Order.findOne({cashfreeOrderId:cfOrderId})
//     if(finalOrder){
//       console.log(`order for ${cfOrderId} already created.skipping webhook`)
//       return res.status(200).send('ok')
//     }

//     const pending = await PendingOrder.findOne({ cashfreeOrderId: cfOrderId })
//     if (!pending) {
//       console.warn('No matching pending order for', cfOrderId);
//       return res.status(200).send('ok');
//     }

//     if (event === "PAYMENT_SUCCESS_WEBHOOK") {

//       const finalOrderCheck = await Order.findOne({ cashfreeOrderId: cfOrderId });
//     if (finalOrderCheck) {
//         console.log(`Order ${cfOrderId} already finalized. Skipping stock update and saving.`);
//         // Ensure the pending order is deleted, just in case the cleanup failed during the first webhook
//         await PendingOrder.deleteOne({ cashfreeOrderId: cfOrderId });
//         return res.status(200).send("ok");
//     }

//       for(const item of pending.Items){
//         await Products.findByIdAndUpdate(item.productId,
//           {$inc:{stock:-item.quantity}},
//           {new:true})
//       }

         
//          const newOrder = new Order({
//         userId: pending.userId,
//         Items: pending.Items,
//         shippingAddress: pending.shippingAddress,
//         totalAmount: pending.totalAmount,
//         paymentStatus: 'paid',
//         cashfreeOrderId: cfOrderId
//       })
         
      

       
//       await newOrder.save()
       
//       await Cart.deleteOne({userId:pending.userId})
//       await PendingOrder.deleteOne({ cashfreeOrderId: cfOrderId })

//       console.log(`Order${cfOrderId} marked as paid`)
//       return res.status(200).send("ok");
      
     
//     }
//     else if (event === "PAYMENT_FAILED_WEBHOOK") {
//       await PendingOrder.updateOne(
//         { _id: pending._id },
//         {
//           paymentStatus: "failed"
//         }
//       )

//       console.log(`Order${cfOrderId} marked as Failed`)
//       return res.status(200).send('ok');
//     }
//     console.log("Unhandled event:", event);
//     return res.status(200).send("ok");
//   }catch (error) {
//         // 2. SECONDARY LOCK: Handle the E11000 concurrency crash gracefully
//         if (error.code === 11000) {
//             console.warn(`[DUPLICATE IGNORED] Order ${error.keyValue.cashfreeOrderId} was processed concurrently.`);
//             return res.status(200).send('ok');
//         }
        
//         // Log all other errors and return 500
//         console.error('CRITICAL WEBHOOK PROCESSING ERROR:', error);
//         return res.status(500).send('server error');
//     }

// }
