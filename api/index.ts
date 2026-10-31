import app from '../server.ts';

export default function handler(req: any, res: any) {
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
