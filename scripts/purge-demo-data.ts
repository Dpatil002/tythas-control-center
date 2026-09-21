import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function purgeDatabase() {
  console.log('🧹 Purging all dummy/demo/seed records from the database...');

  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.monitoringIncident.deleteMany();
  await prisma.monitoringCheck.deleteMany();
  await prisma.conversionEventMapping.deleteMany();
  await prisma.conversionEvent.deleteMany();
  await prisma.customScript.deleteMany();
  await prisma.googleBusinessReview.deleteMany();
  await prisma.integrationCredential.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.formAction.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.form.deleteMany();
  await prisma.analysisIssue.deleteMany();
  await prisma.analyzedPage.deleteMany();
  await prisma.websiteAnalysis.deleteMany();
  await prisma.ownershipVerification.deleteMany();
  await prisma.connectorCredential.deleteMany();
  await prisma.websiteAccess.deleteMany();
  await prisma.postSchema.deleteMany();
  await prisma.pageSchema.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.author.deleteMany();
  await prisma.pageSection.deleteMany();
  await prisma.page.deleteMany();
  await prisma.navigationItem.deleteMany();
  await prisma.navigationMenu.deleteMany();
  await prisma.technicalFile.deleteMany();
  await prisma.sitemapRun.deleteMany();
  await prisma.redirect.deleteMany();
  await prisma.loginEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.website.deleteMany();
  await prisma.client.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('✨ All dummy/demo/seed data successfully purged.');
}

purgeDatabase()
  .catch((e) => {
    console.error('Error during database purge:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
