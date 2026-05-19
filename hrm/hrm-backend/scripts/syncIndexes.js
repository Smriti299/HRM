import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import Company from '../src/models/Company.js';
import Tenant from '../src/models/Tenant.js';
import Employee from '../src/models/Employee.js';
import Department from '../src/models/Department.js';
import Attendance from '../src/models/Attendance.js';
import Leave from '../src/models/Leave.js';
import Payroll from '../src/models/Payroll.js';
import Notification from '../src/models/Notification.js';

const models = [
  Company,
  Tenant,
  Employee,
  Department,
  Attendance,
  Leave,
  Payroll,
  Notification,
];

const syncIndexes = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const model of models) {
    await model.syncIndexes();
    console.log(`Indexes synced: ${model.modelName}`);
  }

  await mongoose.disconnect();
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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

export default syncIndexes;
