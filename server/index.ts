import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Tax990Client } from '../../nodejs/src/index';

const PORT = Number(process.env.PORT) || 4100;

const client = new Tax990Client({
  clientId: process.env.TAX990_CLIENT_ID || '',
  clientSecret: process.env.TAX990_CLIENT_SECRET || '',
  userToken: process.env.TAX990_USER_TOKEN || '',
});

const app = express();
app.use(cors());
app.use(express.json());

// ─── Auth ────────────────────────────────────────────────────────

app.post('/api/auth/token', async (_req, res) => {
  try {
    const result = await client.utility.ping();
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/auth/server-time', async (_req, res) => {
  try {
    const result = await client.utility.ping();
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

// ─── Form 990-N ──────────────────────────────────────────────────

app.post('/api/form990n/create', async (req, res) => {
  try {
    const result = await client.form990n.create(req.body);
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/form990n/get', async (req, res) => {
  try {
    const { SubmissionId, RecordId } = req.query as Record<string, string>;
    const result = await client.form990n.get({ SubmissionId, RecordId });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/form990n/list', async (req, res) => {
  try {
    const { SubmissionId, BusinessId } = req.query as Record<string, string>;
    const result = await client.form990n.list({ SubmissionId, BusinessId });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.post('/api/form990n/update', async (req, res) => {
  try {
    const result = await client.form990n.update(req.body);
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.delete('/api/form990n/delete', async (req, res) => {
  try {
    const { SubmissionId, RecordId } = req.query as Record<string, string>;
    const result = await client.form990n.delete({ SubmissionId, RecordId });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/form990n/validate', async (req, res) => {
  try {
    const { SubmissionId, RecordIds } = req.query as Record<string, string>;
    const result = await client.form990n.validate({
      SubmissionId,
      RecordIds: RecordIds ? RecordIds.split(',') : [],
    });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.post('/api/form990n/transmit', async (req, res) => {
  try {
    const result = await client.form990n.transmit(req.body);
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/form990n/getPDF', async (req, res) => {
  try {
    const { SubmissionId, RecordIds } = req.query as Record<string, string>;
    const result = await client.form990n.getPDF({
      SubmissionId,
      RecordIds: RecordIds ? RecordIds.split(',') : undefined,
    });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/form990n/status', async (req, res) => {
  try {
    const { SubmissionId, RecordIds } = req.query as Record<string, string>;
    const result = await client.form990n.status({
      SubmissionId,
      RecordIds: RecordIds ? RecordIds.split(',') : undefined,
    });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

// ─── Utility ─────────────────────────────────────────────────────

app.get('/api/utility/ping', async (_req, res) => {
  try {
    const result = await client.utility.ping();
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/utility/getAllSubmissionId', async (_req, res) => {
  try {
    const result = await client.utility.getAllSubmissionIds();
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/utility/getSubmissionIdByBusinessId', async (req, res) => {
  try {
    const { businessId } = req.query as Record<string, string>;
    const result = await client.utility.getSubmissionIdByBusinessId({ businessId });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/utility/getSubmissionIdByRecordId', async (req, res) => {
  try {
    const { recordId } = req.query as Record<string, string>;
    const result = await client.utility.getSubmissionIdByRecordId({ recordId });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/utility/getRecordIds', async (_req, res) => {
  try {
    const result = await client.utility.getRecordIds();
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/utility/getRecordIdBySubmissionId', async (req, res) => {
  try {
    const { submissionId } = req.query as Record<string, string>;
    const result = await client.utility.getRecordIdBySubmissionId({ submissionId });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/utility/getRecordDetailBySubmissionId', async (req, res) => {
  try {
    const { submissionId } = req.query as Record<string, string>;
    const result = await client.utility.getRecordDetailBySubmissionId({ submissionId });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/utility/getAllBusinessId', async (_req, res) => {
  try {
    const result = await client.utility.getAllBusinessIds();
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

app.get('/api/utility/getBusinessIdBySubmissionId', async (req, res) => {
  try {
    const { submissionId } = req.query as Record<string, string>;
    const result = await client.utility.getBusinessIdBySubmissionId({ submissionId });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

// ─── Nonprofits ──────────────────────────────────────────────────

app.get('/api/nonprofits/getOrganizationDetailsByEIN', async (req, res) => {
  try {
    const { ein } = req.query as Record<string, string>;
    const result = await client.nonprofits.getOrganizationDetailsByEIN({ ein });
    res.json(result);
  } catch (e: any) {
    const status = e.statusCode ?? 500;
    res.status(status).json(e.responseData ?? { StatusCode: status, StatusMessage: e.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Tax990 SDK proxy server running on http://localhost:${PORT}`);
});
