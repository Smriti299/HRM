require('dotenv').config();
const mongoose = require('mongoose');

const models = [
  require('../src/models/Company'),
  require('../src/models/Tenant'),
  require('../src/models/Employee'),
  require('../src/models/Department'),
  require('../src/models/Attendance'),
  require('../src/models/Leave'),
  require('../src/models/Payroll'),
  require('../src/models/Notification'),
];

const syncIndexes = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const model of models) {
    await model.syncIndexes();
    console.log(`Indexes synced: ${model.modelName}`);
  }

  await mongoose.disconnect();
};

if (require.main === module) {
  syncIndexes()
    .then(() => {
      console.log('All indexes are aligned with the current schemas.');
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Index sync failed:', err);
      await mongoose.disconnect();
      process.exit(1);
    });
}

module.exports = syncIndexes;
