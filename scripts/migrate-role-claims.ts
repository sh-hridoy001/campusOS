import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOTSTRAPPED_ADMIN_EMAIL = 'sazzadhossainhridoy961@gmail.com';
type TrustedRole = 'student' | 'teacher' | 'admin';
const VALID_ROLES = new Set<TrustedRole>(['student', 'teacher', 'admin']);

function loadAppletConfig() {
  const configPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
    projectId: string;
    firestoreDatabaseId?: string;
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) {
    return undefined;
  }
  return args[idx + 1]?.trim();
}

function printUsage() {
  console.log(`CampusOS Firebase Custom Claims Migration Utility

Usage:
  npx tsx scripts/migrate-role-claims.ts --audit
  npx tsx scripts/migrate-role-claims.ts --bootstrap-admin
  npx tsx scripts/migrate-role-claims.ts --email <user@example.com> --role <student|teacher|admin>
  npx tsx scripts/migrate-role-claims.ts --uid <firebaseUid> --role <student|teacher|admin>

Notes:
  - Uses Application Default Credentials (ADC) with firebase-applet-config.json.
  - Never promotes unverified Firestore profile roles automatically during --audit.
`);
}

async function assignRoleClaim(
  adminAuth: ReturnType<typeof getAuth>,
  adminDb: ReturnType<typeof getFirestore>,
  user: UserRecord,
  role: TrustedRole,
) {
  if (
    (user.email || '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL &&
    role !== 'admin'
  ) {
    throw new Error('Refusing to demote the bootstrapped administrator account.');
  }

  const mergedClaims: Record<string, unknown> = {
    ...(user.customClaims ?? {}),
    role,
  };
  await adminAuth.setCustomUserClaims(user.uid, mergedClaims);

  const profileRef = adminDb.collection('profiles').doc(user.uid);
  const profileSnap = await profileRef.get();
  if (profileSnap.exists) {
    await profileRef.update({ role });
  }

  console.log(
    `Updated custom claim role="${role}" for uid=${user.uid} (email=${user.email ?? 'none'}, profileSynced=${profileSnap.exists}).`,
  );
}

async function run() {
  const args = process.argv.slice(2);
  const hasAudit = args.includes('--audit');
  const hasBootstrap = args.includes('--bootstrap-admin');
  const emailArg = getArgValue(args, '--email');
  const uidArg = getArgValue(args, '--uid');
  const roleArg = getArgValue(args, '--role');

  if (!hasAudit && !hasBootstrap && !emailArg && !uidArg) {
    printUsage();
    process.exit(1);
  }

  const config = loadAppletConfig();
  const app = getApps().length
    ? getApp()
    : initializeApp({ projectId: config.projectId });
  const adminAuth = getAuth(app);
  const adminDb =
    config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);

  if (hasAudit) {
    console.log(
      `Auditing non-student Firestore profiles against Firebase Auth Custom Claims in project "${config.projectId}"...`,
    );
    const snap = await adminDb
      .collection('profiles')
      .where('role', 'in', ['teacher', 'admin'])
      .get();

    if (snap.empty) {
      console.log('No teacher or admin profiles found in Firestore.');
      return;
    }

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      try {
        const userRecord = await adminAuth.getUser(docSnap.id);
        const claimRole =
          typeof userRecord.customClaims?.role === 'string'
            ? userRecord.customClaims.role
            : '(none)';
        console.log(
          `- uid=${docSnap.id} | email=${userRecord.email ?? data.email ?? 'unknown'} | firestoreRole=${String(data.role)} | authClaimRole=${claimRole}`,
        );
      } catch (err) {
        console.log(
          `- uid=${docSnap.id} | firestoreRole=${String(data.role)} | authLookupError=${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return;
  }

  if (hasBootstrap) {
    const adminUser = await adminAuth.getUserByEmail(BOOTSTRAPPED_ADMIN_EMAIL);
    if (!adminUser.emailVerified) {
      throw new Error(
        `Bootstrapped admin ${BOOTSTRAPPED_ADMIN_EMAIL} does not have emailVerified=true in Firebase Auth.`,
      );
    }
    await assignRoleClaim(adminAuth, adminDb, adminUser, 'admin');
    return;
  }

  if (!roleArg || !VALID_ROLES.has(roleArg as TrustedRole)) {
    throw new Error('--role must be one of: student, teacher, admin.');
  }

  const targetUser = uidArg
    ? await adminAuth.getUser(uidArg)
    : await adminAuth.getUserByEmail(emailArg!);

  await assignRoleClaim(adminAuth, adminDb, targetUser, roleArg as TrustedRole);
}

run().catch((err) => {
  console.error('Role migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
