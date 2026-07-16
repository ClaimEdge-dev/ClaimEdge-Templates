/*
  ClaimEdgeOS - Invoice Builder App
  A React-based invoice generator for ClaimEdge field services.
  To use: Create a new React app (npx create-react-app claimedge-os),
  replace src/App.js with this file, and run npm start.

  Features:
  - Single job, combined, and day-rate invoices
  - localStorage persistence for invoice history
  - Auto-incrementing invoice numbers (RK-YYYY-XXXX)
  - Email template previews
  - Export to JSON
  - Copy-to-clipboard functionality

  Author: Robert "Bobby" Krapil | ClaimEdge
  Contact: 815-347-4221 | claimedge2026@gmail.com
*/

import React, { useState, useEffect } from "react";

// ============================================
// CONSTANTS — Replace with your actual info
// ============================================
const BOBBY = {
  name: 'Robert "Bobby" Krapil',
  company: "ClaimEdge",
  address: "[YOUR ADDRESS]",
  phone: "[YOUR PHONE]",
  email: "[YOUR EMAIL]",
  zelle: "[YOUR ZELLE]",
  ach: {
    bank: "[YOUR BANK]",
    routing: "[ROUTING NUMBER]",
    account: "[ACCOUNT NUMBER]",
    account_name: "[YOUR NAME]",
  },
};

const RATE_CARD = {
  exteriorInspection: 150,
  detachedInspection: 75,
  interiorInspection: 75,
  polycamScan: 75,
  packagePrep: 150,
  dayRate: 325,
  perProperty: 100,
  mitigationSignup: 150,
  adjusterMeeting: 150,
  xactimateSupport: 125,
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function fmt(val) {
  const n = parseFloat(val);
  return isNaN(n) ? "—" : "$" + n.toFixed(2);
}

function jobSubtotal(job) {
  return job.lineItems.reduce((s, li) => {
    const n = parseFloat(li.amount);
    return s + (isNaN(n) ? 0 : n);
  }, 0);
}

function grandTotal(jobs) {
  return jobs.reduce((s, j) => s + jobSubtotal(j), 0);
}

function nextInvoiceNumber() {
  const invoices = JSON.parse(localStorage.getItem("claimedge_invoices") || "[]");
  const year = new Date().getFullYear();
  const prefix = `RK-${year}-`;
  const nums = invoices
    .map((i) => i.match?.(/RK-\d{4}-(\d{4})/)?.[1])
    .filter(Boolean)
    .map((n) => parseInt(n, 10));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return prefix + String(next).padStart(4, "0");
}

// ============================================
// EMAIL TEMPLATES
// ============================================
const EMAIL_TEMPLATES = {
  proposal: {
    subject: "[YEAR] Field Services & Compensation Proposal",
    body: `[CONTACT NAME],\n\nOver the last several months we've built good momentum together in the [REGION] corridors. I've been handling roof and exterior inspections, interior water documentation, mitigation sign-ups, Xactimate and supplement documentation, and meeting with adjusters to support full-scope approvals.\n\nAs we go into the [YEAR] storm season, I'd like to lock in a simple structure so we both know exactly what to expect.\n\nSee attached proposal for three compensation options.\n\nRespectfully,\n${BOBBY.name}\n${BOBBY.company}\n${BOBBY.phone} | ${BOBBY.email}`,
  },
  invoice850: {
    subject: "Outstanding Invoice – [Claim Name] | $[AMOUNT]",
    body: `[CONTACT NAME],\n\nHere's a clean breakdown of what's currently outstanding:\n\n[CLAIM NAME] — [PROPERTY ADDRESS]\n[CARRIER] Claim #[NUMBER]\n\nTotal due: $[AMOUNT]\n\nPayment Options:\nZelle: ${BOBBY.zelle}\nACH: ${BOBBY.ach.bank} | Routing: ${BOBBY.ach.routing} | Account: ${BOBBY.ach.account}\nCheck: Payable to ${BOBBY.ach.account_name}\n\nThanks,\nBobby\n${BOBBY.phone}`,
  },
  adjusterFollowUp: {
    subject: 'RE: Claim #[NUMBER] - Supplement Documentation Complete',
    body: `Mr./Ms. [ADJUSTER NAME],\n\nFollowing up on our conversation regarding the [DAMAGE TYPE] damage at [PROPERTY_ADDRESS].\n\nI have completed the full field documentation. Key items:\n• [Structure 1]: [SCOPE] per IRC [SECTION]\n• [Structure 2]: [SCOPE] per IRC [SECTION]\n• [Structure 3]: [SCOPE] per IRC [SECTION]\n\nAll Haag criteria confirmed. Package ready for review.\n\nRespectfully,\n${BOBBY.name}\n${BOBBY.phone} | ${BOBBY.email}`,
  },
  buildingDept: {
    subject: "Code Requirements Confirmation - [PROPERTY_ADDRESS]",
    body: `Building Official,\n\nI am writing to request written confirmation of currently enforced building code requirements for a residential restoration project at [PROPERTY_ADDRESS] (Jurisdiction: [CITY]).\n\nPlease confirm requirements for:\n• Solid sheathing (IRC R905.2.1)\n• Ice barrier (IRC R905.1.1)\n• Drip edge (IRC R905.2.8.3)\n• Flashing (IRC R905.2.8)\n• Attic ventilation (IRC R806)\n• WRB integration (IRC R703.1)\n\nWhich IRC cycle is currently enforced?\n\nRespectfully,\n${BOBBY.name}\n${BOBBY.company}\n${BOBBY.phone} | ${BOBBY.email}`,
  },
};

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [activeTab, setActiveTab] = useState("invoice");
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("claimedge_current_invoice");
    if (saved) return JSON.parse(saved);
    return {
      invoiceNumber: nextInvoiceNumber(),
      date: new Date().toISOString().split("T")[0],
      dueDate: "Upon Receipt",
      contractorName: "[CONTRACTOR NAME]",
      contractorContact: "[CONTACT PERSON]",
      contractorAddress: "[ADDRESS]",
      contractorPhone: "[PHONE]",
      jobs: [
        {
          jobId: "A",
          label: "[Claim/Job Name]",
          insuredName: "[INSURED NAME]",
          propertyAddress: "[PROPERTY ADDRESS]",
          carrier: "[CARRIER]",
          claimNumber: "[CLAIM NUMBER]",
          dateOfLoss: "[DATE]",
          inspectionDates: "[DATE(S)]",
          lineItems: [
            { service: "[SERVICE]", detail: "[DETAIL]", amount: "" },
          ],
        },
      ],
    };
  });

  const [emailTab, setEmailTab] = useState("proposal");
  const [history, setHistory] = useState(() => {
    return JSON.parse(localStorage.getItem("claimedge_invoices") || "[]");
  });
  const [copied, setCopied] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("claimedge_current_invoice", JSON.stringify(form));
  }, [form]);

  function updateJob(index, field, value) {
    const jobs = [...form.jobs];
    jobs[index] = { ...jobs[index], [field]: value };
    setForm({ ...form, jobs });
  }

  function updateLineItem(jobIndex, lineIndex, field, value) {
    const jobs = [...form.jobs];
    const lineItems = [...jobs[jobIndex].lineItems];
    lineItems[lineIndex] = { ...lineItems[lineIndex], [field]: value };
    jobs[jobIndex] = { ...jobs[jobIndex], lineItems };
    setForm({ ...form, jobs });
  }

  function addLineItem(jobIndex) {
    const jobs = [...form.jobs];
    jobs[jobIndex].lineItems.push({ service: "", detail: "", amount: "" });
    setForm({ ...form, jobs });
  }

  function removeLineItem(jobIndex, lineIndex) {
    const jobs = [...form.jobs];
    if (jobs[jobIndex].lineItems.length > 1) {
      jobs[jobIndex].lineItems.splice(lineIndex, 1);
      setForm({ ...form, jobs });
    }
  }

  function addJob() {
    const nextId = String.fromCharCode(65 + form.jobs.length);
    setForm({
      ...form,
      jobs: [
        ...form.jobs,
        {
          jobId: nextId,
          label: "[Next Job/Day Rate]",
          insuredName: "",
          propertyAddress: "",
          carrier: "",
          claimNumber: "",
          dateOfLoss: "",
          inspectionDates: "",
          lineItems: [{ service: "", detail: "", amount: "" }],
        },
      ],
    });
  }

  function removeJob(index) {
    if (form.jobs.length > 1) {
      const jobs = form.jobs.filter((_, i) => i !== index);
      setForm({ ...form, jobs });
    }
  }

  function saveInvoice() {
    const invoices = JSON.parse(localStorage.getItem("claimedge_invoices") || "[]");
    invoices.push(form.invoiceNumber);
    localStorage.setItem("claimedge_invoices", JSON.stringify(invoices));
    setHistory(invoices);
    alert(`Invoice ${form.invoiceNumber} saved!`);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function exportJSON() {
    const data = {
      invoice: {
        invoice_number: form.invoiceNumber,
        date: form.date,
        due_date: form.dueDate,
        is_combined: form.jobs.length > 1,
        from: {
          name: BOBBY.name,
          company: BOBBY.company,
          address: BOBBY.address,
          phone: BOBBY.phone,
          email: BOBBY.email,
        },
        bill_to: {
          company: form.contractorName,
          contact: form.contractorContact,
          address: form.contractorAddress,
          phone: form.contractorPhone,
        },
        jobs: form.jobs.map((j) => ({
          job_id: `${form.invoiceNumber}-${j.jobId}`,
          label: j.label,
          claim_info: {
            insured_name: j.insuredName,
            property_address: j.propertyAddress,
            carrier: j.carrier,
            claim_number: j.claimNumber,
            date_of_loss: j.dateOfLoss,
            inspection_dates: j.inspectionDates,
            inspector: BOBBY.name,
          },
          line_items: j.lineItems.map((li, i) => ({
            line_number: i + 1,
            service: li.service,
            detail: li.detail,
            quantity: 1,
            rate: parseFloat(li.amount) || 0,
            amount: parseFloat(li.amount) || 0,
          })),
          subtotal: jobSubtotal(j),
        })),
        totals: {
          subtotal: grandTotal(form.jobs),
          tax: 0.0,
          total_due: grandTotal(form.jobs),
        },
        payment_info: {
          zelle: `${BOBBY.zelle} (${BOBBY.name})`,
          ach: BOBBY.ach,
          check: {
            payable_to: BOBBY.ach.account_name,
            mail_to: BOBBY.address,
          },
        },
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.invoiceNumber}.json`;
    a.click();
  }

  // Build plain-text invoice
  function buildInvoiceText() {
    const isCombined = form.jobs.length > 1;
    let text = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `                        CLAIGNEDGE\n`;
    text += `         Independent Roofing & Mitigation Field Services\n`;
    if (isCombined) text += `              COMBINED INVOICE — MULTIPLE JOBS\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `FROM:\n`;
    text += `  ${BOBBY.name} — ${BOBBY.company}\n`;
    text += `  ${BOBBY.address}\n`;
    text += `  Mobile / Zelle: ${BOBBY.phone}\n`;
    text += `  Email: ${BOBBY.email}\n\n`;
    text += `BILL TO:\n`;
    text += `  ${form.contractorName}\n`;
    text += `  ${form.contractorContact}\n`;
    text += `  ${form.contractorAddress}\n`;
    text += `  ${form.contractorPhone}\n\n`;
    text += `INVOICE #: ${form.invoiceNumber}\n`;
    text += `DATE:      ${form.date}\n`;
    text += `DUE:       ${form.dueDate}\n\n`;

    form.jobs.forEach((job, idx) => {
      if (isCombined) {
        text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        text += `INVOICE #${form.invoiceNumber}-${job.jobId} — ${job.label}\n`;
        text += `Date of Loss: ${job.dateOfLoss} | Inspection(s): ${job.inspectionDates} | Inspector: ${BOBBY.name}\n\n`;
      } else {
        text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `RE: ${job.label}\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        text += `CLAIM / PROJECT INFORMATION\n\n`;
        text += `  Insured Name:        ${job.insuredName}\n`;
        text += `  Property Address:    ${job.propertyAddress}\n`;
        text += `  Carrier:             ${job.carrier}\n`;
        text += `  Claim Number:        ${job.claimNumber}\n`;
        text += `  Date of Loss:        ${job.dateOfLoss}\n`;
        text += `  Inspection Date(s):  ${job.inspectionDates}\n`;
        text += `  Inspector:           ${BOBBY.name}\n\n`;
      }

      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `LINE ITEMS\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      text += `#  Service                    Detail                                   Amount\n`;
      text += `─  ──────────────────────────  ───────────────────────────────────────  ───────\n`;

      job.lineItems.forEach((li, i) => {
        text += `${String(i + 1).padStart(2)}  ${li.service.padEnd(28)}  ${li.detail.padEnd(39)}  ${fmt(li.amount)}\n`;
      });

      text += `\n`;
      if (isCombined) {
        text += `INVOICE #${form.invoiceNumber}-${job.jobId} SUBTOTAL:  ${fmt(jobSubtotal(job))}\n`;
        text += `───────────────────────────────────────────────────────────────────────────────\n\n`;
      } else {
        text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `                                              SUBTOTAL:   ${fmt(jobSubtotal(job))}\n`;
        text += `                                              TAX (1099):  $0.00\n`;
        text += `                                              TOTAL DUE:  ${fmt(grandTotal(form.jobs))}\n`;
      }
    });

    if (isCombined) {
      form.jobs.forEach((job) => {
        text += `                              INVOICE #${form.invoiceNumber}-${job.jobId} SUBTOTAL:    ${fmt(jobSubtotal(job))}\n`;
      });
      text += `                              TAX (1099):                $0.00\n`;
      text += `                              COMBINED TOTAL DUE:       ${fmt(grandTotal(form.jobs))}\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `PAYMENT OPTIONS\n\n`;
    text += `  Zelle:          ${BOBBY.zelle} (${BOBBY.name})\n`;
    text += `  ACH / Direct:   ${BOBBY.ach.bank}\n`;
    text += `                  Routing:  ${BOBBY.ach.routing}\n`;
    text += `                  Account:  ${BOBBY.ach.account}\n`;
    text += `                  Name:     ${BOBBY.ach.account_name}\n`;
    text += `  Check:          Payable to ${BOBBY.ach.account_name}\n`;
    text += `                  Mail to:  ${BOBBY.address}\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Thank you for the continued partnership.\n\n`;
    text += `— Bobby\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `CONFIDENTIAL — ClaimEdge / ${form.contractorName} Internal Document\n`;
    text += `Invoice ${form.invoiceNumber} | Page 1 of 1\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return text;
  }

  // Render invoice preview card
  function InvoicePreview() {
    return (
      <div
        style={{
          background: "#fff",
          padding: 24,
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        {buildInvoiceText()}
      </div>
    );
  }

  // Invoice form (left panel)
  function InvoiceForm() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3>Invoice Details</h3>
        <input
          placeholder="Invoice #"
          value={form.invoiceNumber}
          onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <select
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        >
          <option>Upon Receipt</option>
          <option>Net 15</option>
          <option>Net 30</option>
        </select>

        <h4>Bill To</h4>
        <input
          placeholder="Contractor Name"
          value={form.contractorName}
          onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
        />
        <input
          placeholder="Contact Person"
          value={form.contractorContact}
          onChange={(e) => setForm({ ...form, contractorContact: e.target.value })}
        />
        <input
          placeholder="Address"
          value={form.contractorAddress}
          onChange={(e) => setForm({ ...form, contractorAddress: e.target.value })}
        />
        <input
          placeholder="Phone"
          value={form.contractorPhone}
          onChange={(e) => setForm({ ...form, contractorPhone: e.target.value })}
        />

        {form.jobs.map((job, jobIdx) => (
          <div
            key={jobIdx}
            style={{
              border: "1px solid #ccc",
              padding: 12,
              borderRadius: 6,
              marginTop: 8,
            }}
          >
            <h4>
              Job {job.jobId}: {job.label}
              {form.jobs.length > 1 && (
                <button
                  onClick={() => removeJob(jobIdx)}
                  style={{ marginLeft: 8, fontSize: 11 }}
                >
                  Remove
                </button>
              )}
            </h4>
            <input
              placeholder="Job Label"
              value={job.label}
              onChange={(e) => updateJob(jobIdx, "label", e.target.value)}
            />
            {form.jobs.length <= 1 && (
              <>
                <input
                  placeholder="Insured Name"
                  value={job.insuredName}
                  onChange={(e) =>
                    updateJob(jobIdx, "insuredName", e.target.value)
                  }
                />
                <input
                  placeholder="Property Address"
                  value={job.propertyAddress}
                  onChange={(e) =>
                    updateJob(jobIdx, "propertyAddress", e.target.value)
                  }
                />
                <input
                  placeholder="Carrier"
                  value={job.carrier}
                  onChange={(e) => updateJob(jobIdx, "carrier", e.target.value)}
                />
                <input
                  placeholder="Claim Number"
                  value={job.claimNumber}
                  onChange={(e) =>
                    updateJob(jobIdx, "claimNumber", e.target.value)
                  }
                />
                <input
                  placeholder="Date of Loss"
                  value={job.dateOfLoss}
                  onChange={(e) =>
                    updateJob(jobIdx, "dateOfLoss", e.target.value)
                  }
                />
                <input
                  placeholder="Inspection Date(s)"
                  value={job.inspectionDates}
                  onChange={(e) =>
                    updateJob(jobIdx, "inspectionDates", e.target.value)
                  }
                />
              </>
            )}

            <h5>Line Items</h5>
            {job.lineItems.map((li, liIdx) => (
              <div key={liIdx} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <input
                  placeholder="Service"
                  value={li.service}
                  onChange={(e) =>
                    updateLineItem(jobIdx, liIdx, "service", e.target.value)
                  }
                  style={{ flex: 1 }}
                />
                <input
                  placeholder="Detail"
                  value={li.detail}
                  onChange={(e) =>
                    updateLineItem(jobIdx, liIdx, "detail", e.target.value)
                  }
                  style={{ flex: 2 }}
                />
                <input
                  placeholder="$"
                  type="number"
                  value={li.amount}
                  onChange={(e) =>
                    updateLineItem(jobIdx, liIdx, "amount", e.target.value)
                  }
                  style={{ width: 80 }}
                />
                <button
                  onClick={() => removeLineItem(jobIdx, liIdx)}
                  style={{ fontSize: 11 }}
                >
                  ×
                </button>
              </div>
            ))}
            <button onClick={() => addLineItem(jobIdx)}>+ Add Line Item</button>
            <div style={{ textAlign: "right", fontWeight: "bold", marginTop: 8 }}>
              Subtotal: {fmt(jobSubtotal(job))}
            </div>
          </div>
        ))}

        <button onClick={addJob}>+ Add Job (Combined Invoice)</button>

        <div
          style={{
            borderTop: "2px solid #333",
            paddingTop: 12,
            marginTop: 12,
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "right",
          }}
        >
          TOTAL DUE: {fmt(grandTotal(form.jobs))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => copyToClipboard(buildInvoiceText())}>
            {copied ? "Copied!" : "Copy Invoice"}
          </button>
          <button onClick={saveInvoice}>Save to History</button>
          <button onClick={exportJSON}>Export JSON</button>
        </div>

        {history.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4>Saved Invoices ({history.length})</h4>
            <ul style={{ fontSize: 12 }}>
              {history.slice(-10).map((inv, i) => (
                <li key={i}>{inv}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Email tab content
  function EmailTabContent({ type }) {
    const template = EMAIL_TEMPLATES[type];
    const [subject, setSubject] = useState(template.subject);
    const [body, setBody] = useState(template.body);

    useEffect(() => {
      setSubject(template.subject);
      setBody(template.body);
    }, [type]);

    return (
      <div>
        <h4>Subject</h4>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />
        <h4>Body</h4>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
        />
        <button onClick={() => copyToClipboard(`${subject}\n\n${body}`)}>
          {copied ? "Copied!" : "Copy Email"}
        </button>
      </div>
    );
  }

  // Email preview (simulated email client)
  function EmailPreview() {
    const template = EMAIL_TEMPLATES[emailTab];
    return (
      <div
        style={{
          background: "#f5f5f5",
          padding: 16,
          borderRadius: 8,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 16,
            borderRadius: 4,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ borderBottom: "1px solid #eee", paddingBottom: 8, marginBottom: 12 }}>
            <strong>From:</strong> {BOBBY.name} &lt;{BOBBY.email}&gt;
            <br />
            <strong>To:</strong> [RECIPIENT]
            <br />
            <strong>Subject:</strong> {template.subject}
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "sans-serif",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {template.body}
          </pre>
        </div>
      </div>
    );
  }

  // Rate card display
  function RateCard() {
    return (
      <div>
        <h3>Rate Card</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #333" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Service</th>
              <th style={{ textAlign: "right", padding: 8 }}>Rate</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(RATE_CARD).map(([key, val]) => (
              <tr key={key} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: 8 }}>
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                </td>
                <td style={{ textAlign: "right", padding: 8 }}>${val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Tab buttons
  const tabs = [
    { id: "invoice", label: "Invoice Builder" },
    { id: "email-proposal", label: "Email: Proposal" },
    { id: "email-invoice", label: "Email: Outstanding" },
    { id: "email-adjuster", label: "Email: Adjuster" },
    { id: "email-building", label: "Email: Building Dept" },
    { id: "rate-card", label: "Rate Card" },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <h1>ClaimEdgeOS</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Independent Roofing & Mitigation Field Services — Invoice & Template System
      </p>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              background: activeTab === tab.id ? "#333" : "#f0f0f0",
              color: activeTab === tab.id ? "#fff" : "#333",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "invoice" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <InvoiceForm />
          <div>
            <h3>Preview</h3>
            <InvoicePreview />
          </div>
        </div>
      )}

      {activeTab === "email-proposal" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <EmailTabContent type="proposal" />
          <EmailPreview />
        </div>
      )}

      {activeTab === "email-invoice" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <EmailTabContent type="invoice850" />
          <EmailPreview />
        </div>
      )}

      {activeTab === "email-adjuster" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <EmailTabContent type="adjusterFollowUp" />
          <EmailPreview />
        </div>
      )}

      {activeTab === "email-building" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <EmailTabContent type="buildingDept" />
          <EmailPreview />
        </div>
      )}

      {activeTab === "rate-card" && <RateCard />}
    </div>
  );
}
