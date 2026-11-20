import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/index.js';
import { UnitTCMSClient } from '../src/client.js';

async function main() {
  console.log('====================================================');
  console.log('🤖 Starting MCP Client & Connecting to UnitTCMS Server');
  console.log('====================================================');

  const tcmsClient = new UnitTCMSClient({
    baseUrl: 'http://localhost:8001',
    email: 'admin@example.com',
    password: 'password',
  });

  const { server } = createServer(tcmsClient);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const mcpClient = new Client(
    { name: 'ai-qa-agent', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  await Promise.all([
    server.connect(serverTransport),
    mcpClient.connect(clientTransport),
  ]);

  console.log('✅ Connected to UnitTCMS MCP Server successfully!\n');

  const targetProjectId = 1; // "UnitTCMS Test"

  // Step 1: Create Milestone Module / Folder via MCP Tool
  console.log('📌 [Step 1] Calling MCP Tool: unittcms_create_folder...');
  const folderResult = (await mcpClient.callTool({
    name: 'unittcms_create_folder',
    arguments: {
      projectId: targetProjectId,
      name: '🎯 Milestone 1.0 - Payment Gateway & Billing',
      detail: 'Core release milestone covering checkout, card processing, auto-billing, and performance.',
    },
  })) as any;

  console.log(folderResult.content[0].text);
  const folderJsonMatch = folderResult.content[0].text.match(/\{[\s\S]*\}/);
  const folderData = JSON.parse(folderJsonMatch[0]);
  const milestoneFolderId = folderData.id;

  // Step 2: Create Test Cases in Bulk via MCP Tool
  console.log('\n📌 [Step 2] Calling MCP Tool: unittcms_bulk_create_cases...');
  const testCasesPayload = [
    {
      title: '[Checkout] Berhasil melakukan transaksi kartu kredit valid (3D Secure)',
      description: 'Memverifikasi alur checkout dari keranjang belanja hingga konfirmasi pembayaran sukses.',
      priority: 'critical',
      type: 'functional',
      preConditions: 'User telah login, keranjang berisi minimal 1 item, saldo kartu mencukupi.',
      expectedResults: 'Pembayaran terverifikasi, status order berubah menjadi PAID, email konfirmasi terkirim.',
    },
    {
      title: '[Payment] Penolakan transaksi saat saldo kartu tidak mencukupi (Insufficient Funds)',
      description: 'Memastikan pesan error yang informatif ditampilkan tanpa mencatat transaksi sukses.',
      priority: 'high',
      type: 'functional',
      preConditions: 'User berada di halaman input pembayaran dengan kartu bersaldo nihil.',
      expectedResults: 'Muncul pesan error "Card Declined: Insufficient Funds", stok produk tidak berkurang.',
    },
    {
      title: '[Security] Validasi enkripsi data kartu dan kepatuhan tokenisasi PCI-DSS',
      description: 'Memastikan data CVV dan nomor kartu kredit lengkap (PAN) tidak disimpan plaintext di database.',
      priority: 'critical',
      type: 'security',
      preConditions: 'Network logger aktif saat pengiriman request pembayaran.',
      expectedResults: 'Payload hanya berisi token payment gateway; server tidak menyimpan nomor kartu utuh.',
    },
    {
      title: '[Subscription] Penagihan otomatis (Auto-Billing) siklus bulanan recurring',
      description: 'Memverifikasi penjadwalan cron recurring billing untuk pelanggan aktif.',
      priority: 'medium',
      type: 'functional',
      preConditions: 'Langganan pelanggan jatuh tempo pada hari penagihan H+0.',
      expectedResults: 'Webhook penagihan berhasil dieksekusi dan masa aktif langganan diperpanjang 30 hari.',
    },
    {
      title: '[Performance] Pengujian ketahanan gateway saat peak load 500 TPS',
      description: 'Stress testing endpoint pembayaran untuk memastikan tidak terjadi request timeout atau deadlock.',
      priority: 'high',
      type: 'performance',
      preConditions: 'Lingkungan staging dengan load generator k6 siap dijalankan.',
      expectedResults: 'P99 response time tetap di bawah 800ms dan error rate transaksi kurang dari 0.1%.',
    },
  ];

  const bulkCasesResult = (await mcpClient.callTool({
    name: 'unittcms_bulk_create_cases',
    arguments: {
      folderId: milestoneFolderId,
      cases: testCasesPayload,
    },
  })) as any;

  console.log(bulkCasesResult.content[0].text);

  // Retrieve the generated case IDs
  const casesJsonMatch = bulkCasesResult.content[0].text.match(/\[[\s\S]*\]/);
  const createdCases = JSON.parse(casesJsonMatch[0]);
  const createdCaseIds: number[] = createdCases.map((c: any) => c.id);

  // Step 3: Create Test Run (Milestone Execution Session) via MCP Tool
  console.log('\n📌 [Step 3] Calling MCP Tool: unittcms_create_run...');
  const runResult = (await mcpClient.callTool({
    name: 'unittcms_create_run',
    arguments: {
      projectId: targetProjectId,
      name: '🚀 Milestone 1.0 - Release Candidate 1 (RC1) Execution',
      description: 'Sesi eksekusi test milestone 1.0 untuk validasi payment & subscription sebelum deployment ke production.',
      caseIds: createdCaseIds,
    },
  })) as any;

  console.log(runResult.content[0].text);
  const runJsonMatch = runResult.content[0].text.match(/\{[\s\S]*\}/);
  const runData = JSON.parse(runJsonMatch[0]);
  const milestoneRunId = runData.id;

  // Step 4: Record Execution Results & Comments via MCP Tool
  console.log('\n📌 [Step 4] Calling MCP Tool: unittcms_update_run_case_result (Updating Results & Failure Logs)...');

  // Case 1: Passed
  await mcpClient.callTool({
    name: 'unittcms_update_run_case_result',
    arguments: {
      runId: milestoneRunId,
      caseId: createdCaseIds[0],
      status: 'passed',
      comment: '✅ 3D Secure OTP authentication lolos dalam 180ms. Order invoice #INV-2026-001 terbit.',
    },
  });
  console.log(`- Case #${createdCaseIds[0]} -> PASSED`);

  // Case 2: Passed
  await mcpClient.callTool({
    name: 'unittcms_update_run_case_result',
    arguments: {
      runId: milestoneRunId,
      caseId: createdCaseIds[1],
      status: 'passed',
      comment: '✅ UI menampilkan pesan ramah "Card Declined" sesuai standar UX.',
    },
  });
  console.log(`- Case #${createdCaseIds[1]} -> PASSED`);

  // Case 3: Passed
  await mcpClient.callTool({
    name: 'unittcms_update_run_case_result',
    arguments: {
      runId: milestoneRunId,
      caseId: createdCaseIds[2],
      status: 'passed',
      comment: '✅ Audit keamanan PCI-DSS lulus. Tidak ditemukan plain credit card number di request maupun log backend.',
    },
  });
  console.log(`- Case #${createdCaseIds[2]} -> PASSED`);

  // Case 4: Retest with Notes
  await mcpClient.callTool({
    name: 'unittcms_update_run_case_result',
    arguments: {
      runId: milestoneRunId,
      caseId: createdCaseIds[3],
      status: 'retest',
      comment: '⚠️ Delay pada antrean webhook (3.8 detik). Tim backend telah deploy optimasi worker, dijadwalkan untuk re-test.',
    },
  });
  console.log(`- Case #${createdCaseIds[3]} -> RETEST`);

  // Case 5: Failed with Error Stack
  await mcpClient.callTool({
    name: 'unittcms_update_run_case_result',
    arguments: {
      runId: milestoneRunId,
      caseId: createdCaseIds[4],
      status: 'failed',
      comment: '❌ [BLOCKER] Connection pool exhausted pada concurrency 410 TPS. Error: Timeout waiting for available DB connection (>5000ms). Perlu peningkatan connection pool size.',
    },
  });
  console.log(`- Case #${createdCaseIds[4]} -> FAILED`);

  // Step 5: Read Resource unittcms://runs/{runId}
  console.log('\n📌 [Step 5] Reading MCP Resource: unittcms://runs/' + milestoneRunId + '...');
  const resourceResult = (await mcpClient.readResource({
    uri: `unittcms://runs/${milestoneRunId}`,
  })) as any;

  const runResourceData = JSON.parse(resourceResult.contents[0].text);
  console.log('Status Counts Breakdown:');
  console.log(JSON.stringify(runResourceData.statusCounts, null, 2));

  console.log('\n====================================================');
  console.log('🎉 MCP Demonstration Finished Successfully!');
  console.log('====================================================');
  console.log(`Project: UnitTCMS Test (ID: ${targetProjectId})`);
  console.log(`Milestone Folder: ID ${milestoneFolderId}`);
  console.log(`Milestone Test Run: ID ${milestoneRunId}`);
  console.log(`Web URL Folders: http://localhost:8000/en/projects/${targetProjectId}/folders`);
  console.log(`Web URL Run Detail: http://localhost:8000/en/projects/${targetProjectId}/runs/${milestoneRunId}`);

  await mcpClient.close();
  await server.close();
}

main().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
