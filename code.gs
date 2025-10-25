
/***************************************************
 * SANAM v3.1 - Generated Code.gs
 ***************************************************/
const ADMIN_EMAIL = "am2024any@icloud.com";
const BASE_URL = "https://sanam2025m.github.io/al_11/";

// --- initSheets ---
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsConfig = {
    "الحضور": ["الوقت","الاسم الرباعي","رقم الهوية","رقم الجوال","الموقع","الوردية","نوع الدوام","ملاحظة","العملية","رقم الجهاز","OTP"],
    "المخالفات": ["الوقت","نوع المخالفة","الاسم الرباعي","رقم الهوية","رقم الجوال","الموقع","الوردية","الوصف/الملاحظة","رقم الجهاز","OTP","الحالة"],
    "الحالات الأمنية": ["الوقت","نوع الحالة","اسم المبلّغ","رقم الهوية","رقم الجوال","الوصف","الموقع","الوردية","رقم الجهاز","الحالة"],
    "طلبات التغطية": ["الوقت","الاسم","رقم الهوية","رقم الجوال","الموقع","الوردية","المبلغ","الآيبان","اسم المُغطّى عنه","هوية المُغطّى عنه","ملاحظة","OTP","الحالة","رقم الجهاز"],
    "توثيق الأجهزة": ["الوقت","رقم الجهاز","اسم المستخدم","رقم الهوية","رقم الجوال","الموقع","تم التوثيق بواسطة","ملاحظة","الحالة"]
  };
  Object.entries(sheetsConfig).forEach(function(pair) {
    var name = pair[0];
    var headers = pair[1];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
      sheet.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#FFF8E1").setHorizontalAlignment("center");
    } else {
      var existing = sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getValues()[0] || [];
      headers.forEach(function(h,i){ if (existing[i] !== h) sheet.getRange(1,i+1).setValue(h); });
    }
  });
}

// sheetToObjects
function sheetToObjects(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  var vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  var headers = vals[0].map(function(h){ return String(h||"").trim(); });
  var rows = vals.slice(1);
  return rows.map(function(r) {
    var obj = {};
    headers.forEach(function(h,i){ obj[h || ("col"+(i+1))] = r[i]; });
    return obj;
  });
}

// sendNotificationEmail
function sendNotificationEmail(type,data,sheetName,rowNumber) {
  var subject = "🟤 نظام سنام — إضافة " + type + " جديدة";
  var adminLink = BASE_URL;
  if (type==="تغطية") adminLink += "coverage_admin_list.html";
  else if (type==="توثيق") adminLink += "verify_admin.html";
  else if (type==="مخالفة") adminLink += "violations_updated.html";
  var htmlBody = '<div style="font-family:Tahoma, Arial, sans-serif; direction:rtl; text-align:right;">';
  htmlBody += '<h2>تم تسجيل ' + type + ' جديدة</h2>';
  htmlBody += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">';
  if (typeof data === "object") {
    for (var k in data) {
      if (data.hasOwnProperty(k)) {
        var v = data[k];
        htmlBody += '<tr><td style="background:#f4f4f4;"><b>' + k + '</b></td><td>' + (v||'-') + '</td></tr>';
      }
    }
  } else {
    htmlBody += '<tr><td><b>البيانات</b></td><td>' + data + '</td></tr>';
  }
  htmlBody += '</table>';
  htmlBody += '<p>🕒 الوقت: ' + new Date().toLocaleString("ar-SA") + '</p>';
  htmlBody += '<p><a href="' + adminLink + '" style="display:inline-block;padding:10px 14px;background:#b89067;color:#fff;border-radius:6px;text-decoration:none;">عرض في لوحة الإدارة</a></p>';
  htmlBody += '</div>';
  MailApp.sendEmail({ to: ADMIN_EMAIL, subject: subject, htmlBody: htmlBody });
}

// escapeHtml
function escapeHtml(text) {
  return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// doPost
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents || "{}");
    var action = payload.action || "";
    var sheetName="", typeName="", row=[];
    if (action==="coverage_add") {
      sheetName="طلبات التغطية"; typeName="تغطية";
      row=[new Date(), payload.name||"", payload.nationalId||"", payload.phone||"", payload.location||"", payload.shift||"", payload.amount||"", payload.iban||"", payload.coveredName||"", payload.coveredNid||"", payload.note||"", payload.otp||"", "بانتظار الاعتماد", payload.deviceId||""];
    } else if (action==="verify_add") {
      sheetName="توثيق الأجهزة"; typeName="توثيق";
      row=[new Date(), payload.deviceId||"", payload.userName||"", payload.nationalId||"", payload.phone||"", payload.location||"", payload.verifiedBy||"", payload.note||"", "بانتظار المراجعة"];
    } else if (action==="violation_add") {
      sheetName="المخالفات"; typeName="مخالفة";
      row=[new Date(), payload.type||"", payload.fullName||"", payload.nationalId||"", payload.phone||"", payload.location||"", payload.shift||"", payload.note||"", payload.deviceId||"", payload.otp||"", "جديدة"];
    } else {
      return ContentService.createTextOutput(JSON.stringify({result:"error", message:"unknown action"})).setMimeType(ContentService.MimeType.JSON);
    }
    var sh = ss.getSheetByName(sheetName);
    if (!sh) { initSheets(); sh = ss.getSheetByName(sheetName); }
    sh.appendRow(row);
    var rowNumber = sh.getLastRow();
    sendNotificationEmail(typeName, payload, sheetName, rowNumber);
    return ContentService.createTextOutput(JSON.stringify({result:"ok", type:typeName, row:rowNumber})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result:"error", message:err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// doGet
function doGet(e) {
  try {
    var action = (e.parameter.action||"").toLowerCase();
    if (!action) return ContentService.createTextOutput(JSON.stringify({result:"ok", message:"SANAM WebApp"})).setMimeType(ContentService.MimeType.JSON);
    if (action==="coverage_list") { var rows = sheetToObjects("طلبات التغطية"); return ContentService.createTextOutput(JSON.stringify({rows:rows})).setMimeType(ContentService.MimeType.JSON); }
    if (action==="violations_list") { var rows = sheetToObjects("المخالفات"); return ContentService.createTextOutput(JSON.stringify({rows:rows})).setMimeType(ContentService.MimeType.JSON); }
    if (action==="attendance_list") { var rows = sheetToObjects("الحضور"); return ContentService.createTextOutput(JSON.stringify({rows:rows})).setMimeType(ContentService.MimeType.JSON); }
    if (action==="list_verifications") {
      var rows = sheetToObjects("توثيق الأجهزة");
      var html = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">';
      if (rows.length===0) { html += '<tr><td>لا توجد بيانات</td></tr>'; }
      else {
        var headers = Object.keys(rows[0]); html += '<thead><tr>';
        for (var i=0;i<headers.length;i++) html += '<th style="background:#faf2e7;padding:8px;">' + escapeHtml(headers[i]) + '</th>';
        html += '</tr></thead><tbody>';
        for (var r=0;r<rows.length;r++) {
          html += '<tr>';
          for (var j=0;j<headers.length;j++) html += '<td style="padding:8px;">' + escapeHtml(String(rows[r][headers[j]]||'')) + '</td>';
          html += '</tr>';
        }
        html += '</tbody>';
      }
      html += '</table>';
      return HtmlService.createHtmlOutput(html);
    }
    return ContentService.createTextOutput(JSON.stringify({result:"error", message:"unknown action"})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) { return ContentService.createTextOutput(JSON.stringify({result:"error", message:err.toString()})).setMimeType(ContentService.MimeType.JSON); }
}

function onOpen() { initSheets(); }
