const Cart = require("../models/Cart");
const PendingOrder = require("../models/PendingOrder")
const Order = require("../models/orders")
const Products=require("../models/products")

module.exports = async (req, res) => {
  try {
    const payload = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString())
      : req.body;

    console.log("Cashfree payload:", payload);

    const event = payload.type;

    const cfOrderId = payload.data?.order?.order_id;

    if (!cfOrderId) {
      return res.status(400).json({ msg: "missing order id" })
    }

    const finalOrder=await Order.findOne({cashfreeOrderId:cfOrderId})
    if(finalOrder){
      console.log(`order for ${cfOrderId} already created.skipping webhook`)
      return res.status(200).send('ok')
    }

    const pending = await PendingOrder.findOne({ cashfreeOrderId: cfOrderId })
    if (!pending) {
      console.warn('No matching pending order for', cfOrderId);
      return res.status(200).send('ok');
    }

    if (event === "PAYMENT_SUCCESS_WEBHOOK") {

      const finalOrderCheck = await Order.findOne({ cashfreeOrderId: cfOrderId });
    if (finalOrderCheck) {
        console.log(`Order ${cfOrderId} already finalized. Skipping stock update and saving.`);
        // Ensure the pending order is deleted, just in case the cleanup failed during the first webhook
        await PendingOrder.deleteOne({ cashfreeOrderId: cfOrderId });
        return res.status(200).send("ok");
    }

      for(const item of pending.Items){
        await Products.findByIdAndUpdate(item.productId,
          {$inc:{stock:-item.quantity}},
          {new:true})
      }

         
         const newOrder = new Order({
        userId: pending.userId,
        Items: pending.Items,
        shippingAddress: pending.shippingAddress,
        totalAmount: pending.totalAmount,
        paymentStatus: 'paid',
        cashfreeOrderId: cfOrderId
      })
         
      

       
      await newOrder.save()
       
      await Cart.deleteOne({userId:pending.userId})
      await PendingOrder.deleteOne({ cashfreeOrderId: cfOrderId })

      console.log(`Order${cfOrderId} marked as paid`)
      return res.status(200).send("ok");
      
     
    }
    else if (event === "PAYMENT_FAILED_WEBHOOK") {
      await PendingOrder.updateOne(
        { _id: pending._id },
        {
          paymentStatus: "failed"
        }
      )

      console.log(`Order${cfOrderId} marked as Failed`)
      return res.status(200).send('ok');
    }
    console.log("Unhandled event:", event);
    return res.status(200).send("ok");
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('server error');
  }

}
