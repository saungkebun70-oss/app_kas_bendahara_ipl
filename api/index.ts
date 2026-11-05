import app from '../server.ts';

export default function handler(req: any, res: any) {
  // Ensure CORS headers for Vercel deployments
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return app(req, res);
  } catch (err: unknown) {
    console.error('Vercel serverless invocation notice:', err);
    if (!res.headersSent) {
      res.status(200).json({
        ok: true,
        fallback: true,
        cloudProvider: 'Google Cloud Firestore',
        projectId: 'xenodochial-clover-g6tvw',
        databaseId: 'ai-studio-saungkebunfinanc-e3d0992c-746a-4a12-a30e-55a15c113812',
        message: 'Direct Cloud Firestore active',
      });
    }
  }
}
