require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../src/models/Company');

const toSlug = (value) =>
  String(value || 'company')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'company';

const getUniqueSlug = async (base, companyId) => {
  let slug = base;
  let suffix = 1;

  while (await Company.findOne({ slug, _id: { $ne: companyId } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
};

const backfillCompanySlugs = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const companies = await Company.find({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }],
  });

  for (const company of companies) {
    const baseSlug = toSlug(company.name);
    company.slug = await getUniqueSlug(baseSlug, company._id);
    await company.save();
    console.log(`Company slug set: ${company.name} -> ${company.slug}`);
  }

  console.log(`Backfilled ${companies.length} company slug(s).`);
  await mongoose.disconnect();
};

if (require.main === module) {
  backfillCompanySlugs()
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error('Company slug backfill failed:', err);
      await mongoose.disconnect();
      process.exit(1);
    });
}

module.exports = backfillCompanySlugs;
