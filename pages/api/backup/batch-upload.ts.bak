import prisma from '@/lib/db/prisma';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req, uploadDir) {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.multiples = true;
    form.uploadDir = uploadDir;
    form.keepExtensions = true;
    form.maxFileSize = 20 * 1024 * 1024;
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'admin-user-id');
      await mkdir(uploadDir, { recursive: true });
      const { fields, files } = await parseForm(req, uploadDir);
      const fileArr = Array.isArray(files.files) ? files.files : [files.files];
      const fileMetas = fileArr.filter(Boolean).map((file) => {
        const relPath = path.relative(path.join(process.cwd(), 'public'), file.filepath);
        return {
          fileId: randomUUID(),
          name: file.originalFilename,
          path: relPath,
          status: 'PENDING',
        };
      });
      const job = await prisma.batchJob.create({
        data: {
          userId: 'admin-user-id',
          status: 'PENDING',
          files: fileMetas,
          progress: 0,
          total: fileMetas.length,
        },
      });
      return res.status(200).json({ jobId: job.id, accepted: fileMetas.length, rejected: 0 });
    } catch (e) {
      return res.status(500).json({ error: (e instanceof Error) ? e.message : String(e) });
    }
  } else if (req.method === 'GET') {
    try {
      const jobId = req.query.jobId;
      if (!jobId) {
        return res.status(400).json({ error: 'jobId is required' });
      }
      const job = await prisma.batchJob.findUnique({ where: { id: jobId } });
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      return res.status(200).json({ status: job.status, progress: job.progress, total: job.total, error: job.error });
    } catch (e) {
      return res.status(500).json({ error: (e instanceof Error) ? e.message : String(e) });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 