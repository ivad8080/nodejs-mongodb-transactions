const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const accounts = client.db('test').collection('accounts');
const transfers = client.db('test').collection('transfers');

let account_id_sender = 'MDB574189300';
let account_id_receiver = 'MDB7902356';
let transaction_amount = 100;

const session = client.startSession();

const main = async () => {
  try {
    const transactionResults = await session.withTransaction(async () => {
      const updateSenderResults = await accounts.updateOne(
        { account_id: account_id_sender },
        { $inc: { balance: -transaction_amount } },
        { session }
      );

      const updateReceiverResults = await accounts.updateOne(
        { account_id: account_id_receiver },
        { $inc: { balance: transaction_amount } },
        { session }
      );

      const transfer = {
        transfer_id: `TR${Date.now()}`,
        amount: transaction_amount,
        from_account: account_id_sender,
        to_account: account_id_receiver,
      };
      const insertTransferResults = await transfers.insertOne(transfer, {
        session,
      });
      console.log(
        `Successfully Transfer Inserted: ${insertTransferResults.insertedId}`
      );

      const updateSenderTransferResults = await accounts.updateOne(
        { account_id: account_id_sender },
        { $push: { transfer_complete: transfer.transfer_id } },
        { session }
      );

      const updateReceiverTransferResults = await accounts.updateOne(
        { account_id: account_id_receiver },
        { $push: { transfer_complete: transfer.transfer_id } },
        { session }
      );
    });

    console.log(`Committing Transaction ...`);
  } catch (error) {
    console.error(`Transaction aborted: ${error}`);
    process.exit(1);
  } finally {
    console.log(`The reservation was successfully created.`);
    await session.endSession();
    await client.close();
  }
};

main();
