/***************************************************
 * 🔰 SANAM — Google Apps Script (Final)
 * استقبال الطلبات من واجهات HTML (GitHub Pages)
 * + إنشاء أوراق تلقائيًا + إشعارات بريد + دعم CORS
 ***************************************************/

// 📦 إعدادات عامة
const SPREADSHEET_ID   = '1FiVHbDBLRRtgI0Q4Rs7DRHoOeG9jU1UpnCOwRT2qMfg';
const FOLDER_ID        = '1Qb89RWoNedpJkNYn3AyryOD2J1jh8q02';
const SUPERVISOR_EMAIL = 'am2024any@icloud.com';
const ADMIN_EMAIL      = 'am2024any@icloud.com';
const BASE_URL         = 'https://sanam2025m.github.io/al_11/';
const TZ               = 'Asia/Riyadh';

/***************************************************
 * 🧱 تهيئة الأوراق تلقائيًا
 ***************************************************/
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsConfig = {
    "الحضور": ["الوقت","الاسم الرباعي","رقم الهوية","رقم الجوال","الموقع","الوردية","نوع الدوام","ملاحظة","العملية","رقم الجهاز","OTP"],
    "المخالفات": ["الوقت","نوع المخالفة","الاسم الرباعي","رقم الهوية","رقم الجوال","الموقع","الوردية","الوصف/الملاحظة","رقم الجهاز","OTP","الحالة"],
    "الحالات الأمنية": ["الوقت","نوع الحالة","اسم المبلّغ","رقم الهوية","رقم الجوال","الوصف","الموقع","الوردية","رقم الجهاز","الحالة"],
    "طلبات التغطية": ["الوقت","الاسم","رقم الهوية","رقم الجوال","الموقع","الوردية","المبلغ","الآيبان","اسم المُغطّى عنه","هوية المُغطّى عنه","ملاحظة","OTP","الحالة","رقم الجهاز"],
    "توثيق الأجهزة": ["الوقت","رقم الجهاز","اسم المستخدم","رقم الهوية","رقم الجوال","الموقع","تم التوثيق بواسطة","ملاحظة","الحالة"]
  };

  Object.entries(sheetsConfig).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setFontWeight("bold")
           .setBackground("#FFF8E1")
           .setHorizontalAlignment("center");
    } else {
      const existing = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      headers.forEach((h, i) => {
        if (existing[i] !== h) sheet.getRange(1, i + 1).setValue(h);
      });
    }
  });
}

/***************************************************
 * 🔹 تحويل ورقة إلى مصفوفة كائنات
 ***************************************************/
function sheetToObjects(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  const headers = vals[0].map(h => String(h || "").trim());
  return vals.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h || "col" + (i + 1)] = row[i]);
    return obj;
  });
}

/***************************************************
 * ✉️ إرسال إشعار بالبريد
 ***************************************************/
function sendNotificationEmail(type, data, sheetName, rowNumber) {
  const subject = "🟤 نظام سنام — إضافة " + type + " جديدة";
  let adminLink = BASE_URL;
  if (type === "تغطية") adminLink += "coverage_admin_list.html";
  else if (type === "توثيق") adminLink += "verify_admin.html";
  else if (type === "مخالفة") adminLink += "violations_updated.html";

  let htmlBody = '<div style="font-family:Tahoma, Arial, sans-serif; direction:rtl; text-align:right;">';
  htmlBody += '<h2>تم تسجيل ' + type + ' جديدة</h2><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">';
  for (const k in data) {
    if (data.hasOwnProperty(k)) {
      htmlBody += `<tr><td style="background:#f4f4f4;"><b>${escapeHtml(k)}</b></td><td>${escapeHtml(String(data[k] || "-"))}</td></tr>`;
    }
  }
  htmlBody += '</table><p>🕒 الوقت: ' + new Date().toLocaleString("ar-SA") + '</p>';
  htmlBody += `<p><a href="${adminLink}" style="display:inline-block;padding:10px 14px;background:#b89067;color:#fff;border-radius:6px;text-decoration:none;">عرض في لوحة الإدارة</a></p></div>`;

  MailApp.sendEmail({ to: ADMIN_EMAIL, subject, htmlBody });
}

function escapeHtml(text) {
  return text.replace(/&/g,"&amp;").replace(/</g,"&lt;")
             .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
             .replace(/'/g,"&#039;");
}

/***************************************************
 * 🌐 دعم CORS لجميع الطلبات
 ***************************************************/
function setCorsHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function doOptions(e) {
  return setCorsHeaders(ContentService.createTextOutput(''));
}

/***************************************************
 * 📩 استقبال POST من النماذج
 ***************************************************/
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const payload = JSON.parse(e.postData.contents || "{}");
    const action = payload.action || "";
    let sheetName = "", typeName = "", row = [];

    if (action === "coverage_add") {
      sheetName = "طلبات التغطية"; typeName = "تغطية";
      row = [new Date(), payload.name, payload.nationalId, payload.phone, payload.location,
             payload.shift, payload.amount, payload.iban, payload.coveredName, payload.coveredNid,
             payload.note, payload.otp, "بانتظار الاعتماد", payload.deviceId];
    } else if (action === "verify_add") {
      sheetName = "توثيق الأجهزة"; typeName = "توثيق";
      row = [new Date(), payload.deviceId, payload.userName, payload.nationalId, payload.phone,
             payload.location, payload.verifiedBy, payload.note, "بانتظار المراجعة"];
    } else if (action === "violation_add") {
      sheetName = "المخالفات"; typeName = "مخالفة";
      row = [new Date(), payload.type, payload.fullName, payload.nationalId, payload.phone,
             payload.location, payload.shift, payload.note, payload.deviceId, payload.otp, "جديدة"];
    } else {
      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ result: "error", message: "unknown action" })));
    }

    let sh = ss.getSheetByName(sheetName);
    if (!sh) { initSheets(); sh = ss.getSheetByName(sheetName); }

    sh.appendRow(row);
    const rowNumber = sh.getLastRow();
    sendNotificationEmail(typeName, payload, sheetName, rowNumber);

    return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ result: "ok", type: typeName, row: rowNumber })));
  } catch (err) {
    return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() })));
  }
}

/***************************************************
 * 🔎 استقبال GET لعرض القوائم
 ***************************************************/
function doGet(e) {
  try {
    const action = (e.parameter.action || "").toLowerCase();

    if (!action)
      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ result: "ok", message: "SANAM WebApp Ready" })));

    if (action === "coverage_list")
      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ rows: sheetToObjects("طلبات التغطية") })));

    if (action === "violations_list")
      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ rows: sheetToObjects("المخالفات") })));

    if (action === "attendance_list")
      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ rows: sheetToObjects("الحضور") })));

    if (action === "list_verifications") {
      const rows = sheetToObjects("توثيق الأجهزة");
      let html = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">';
      if (!rows.length) html += '<tr><td>لا توجد بيانات</td></tr>';
      else {
        const headers = Object.keys(rows[0]);
        html += '<thead><tr>' + headers.map(h => `<th style="background:#faf2e7;padding:8px;">${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>';
        rows.forEach(r => {
          html += '<tr>' + headers.map(h => `<td style="padding:8px;">${escapeHtml(String(r[h] || ''))}</td>`).join('') + '</tr>';
        });
        html += '</tbody>';
      }
      html += '</table>';
      return HtmlService.createHtmlOutput(html);
    }

    return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ result: "error", message: "unknown action" })));
  } catch (err) {
    return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() })));
  }
}

/***************************************************
 * ⚙️ تشغيل التهيئة تلقائيًا عند فتح الشيت
 ***************************************************/
function onOpen() { initSheets(); }
