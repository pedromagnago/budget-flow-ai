/**
 * Client-side OFX parser for banking statements.
 * Handles standard SGML/XML OFX formats (common in Brazilian banks).
 * All processing happens locally in the browser — zero backend required.
 */

export interface OFXTransaction {
  fitid: string;          // Unique transaction ID
  type: string;           // DEBIT, CREDIT, etc.
  date: string;           // ISO date string YYYY-MM-DD
  amount: number;
  memo: string;
  checknum?: string;
}

export interface OFXResult {
  bankId: string;
  accountId: string;
  accountType: string;
  startDate: string;
  endDate: string;
  balance: number;
  transactions: OFXTransaction[];
}

function parseOFXDate(raw: string): string {
  // OFX dates: YYYYMMDDHHMMSS or YYYYMMDD
  const y = raw.substring(0, 4);
  const m = raw.substring(4, 6);
  const d = raw.substring(6, 8);
  return `${y}-${m}-${d}`;
}

function extractTag(content: string, tag: string): string {
  // Handles both SGML (<TAG>value) and XML (<TAG>value</TAG>) formats
  const re = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const match = content.match(re);
  return match ? match[1].trim() : '';
}

function extractBlock(content: string, tag: string): string[] {
  const blocks: string[] = [];
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  let pos = 0;

  while (pos < content.length) {
    const start = content.indexOf(openTag, pos);
    if (start === -1) break;
    const end = content.indexOf(closeTag, start);
    if (end === -1) break;
    blocks.push(content.substring(start + openTag.length, end));
    pos = end + closeTag.length;
  }

  return blocks;
}

export function parseOFX(text: string): OFXResult {
  // Normalize line endings
  const content = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const bankId = extractTag(content, 'BANKID');
  const accountId = extractTag(content, 'ACCTID');
  const accountType = extractTag(content, 'ACCTTYPE') || 'CHECKING';

  const dtStart = extractTag(content, 'DTSTART');
  const dtEnd = extractTag(content, 'DTEND');
  const balAmt = extractTag(content, 'BALAMT');

  const stmtTrns = extractBlock(content, 'STMTTRN');

  const transactions: OFXTransaction[] = stmtTrns.map(block => {
    const trnType = extractTag(block, 'TRNTYPE');
    const dtPosted = extractTag(block, 'DTPOSTED');
    const trnAmt = extractTag(block, 'TRNAMT');
    const fitid = extractTag(block, 'FITID');
    const memo = extractTag(block, 'MEMO') || extractTag(block, 'NAME') || '';
    const checknum = extractTag(block, 'CHECKNUM') || undefined;

    return {
      fitid,
      type: trnType,
      date: dtPosted ? parseOFXDate(dtPosted) : '',
      amount: parseFloat(trnAmt.replace(',', '.')) || 0,
      memo,
      checknum,
    };
  });

  return {
    bankId,
    accountId,
    accountType,
    startDate: dtStart ? parseOFXDate(dtStart) : '',
    endDate: dtEnd ? parseOFXDate(dtEnd) : '',
    balance: parseFloat(balAmt?.replace(',', '.') ?? '0') || 0,
    transactions,
  };
}
