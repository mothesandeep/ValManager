import type { Party } from '@/features/parties/types';
import { resolvePartyMatch } from '@/features/parties/utils';
import type {
  InwardBagExtraction,
  InwardChallanData,
  OutwardBagExtraction,
  EmptyRolaBagExtraction,
  OutwardChallanData,
  ExtractedChallanData,
} from './types';
import { parseChallanDate, parseTarAndTwist } from './parsers';

/**
 * Normalizes parsed raw record into clean ExtractedChallanData
 */
export function normalizeExtractedData(
  raw: Record<string, unknown>,
  challanType: 'INWARD' | 'OUTWARD',
  knownParties?: Party[]
): ExtractedChallanData {
  const challanNo =
    raw.challanNo != null && String(raw.challanNo).trim() !== ''
      ? String(raw.challanNo).trim()
      : raw.challan_no != null && String(raw.challan_no).trim() !== ''
      ? String(raw.challan_no).trim()
      : null;

  const rawDate = raw.date ?? raw.Date;
  const date = parseChallanDate(rawDate) || (rawDate != null && String(rawDate).trim() !== '' ? String(rawDate).trim() : null);

  const rawPartyName =
    raw.partyName != null && String(raw.partyName).trim() !== ''
      ? String(raw.partyName).trim()
      : raw.party_name != null && String(raw.party_name).trim() !== ''
      ? String(raw.party_name).trim()
      : null;

  let partyName = rawPartyName;
  if (rawPartyName && knownParties && knownParties.length > 0) {
    const matched = resolvePartyMatch(knownParties, rawPartyName);
    if (matched) {
      partyName = matched.name;
    }
  }

  if (challanType === 'INWARD') {
    let grossKg =
      typeof raw.slipGrossTotal === 'number'
        ? raw.slipGrossTotal
        : typeof raw.gross_kg === 'number'
        ? raw.gross_kg
        : raw.slipGrossTotal
        ? parseFloat(String(raw.slipGrossTotal))
        : raw.gross_kg
        ? parseFloat(String(raw.gross_kg))
        : null;
    if (grossKg != null && grossKg > 500) {
      grossKg = Number((grossKg / 1000).toFixed(3));
    }

    let tareKg =
      typeof raw.slipTareTotal === 'number'
        ? raw.slipTareTotal
        : typeof raw.tare_deduction_kg === 'number'
        ? raw.tare_deduction_kg
        : raw.slipTareTotal
        ? parseFloat(String(raw.slipTareTotal))
        : raw.tare_deduction_kg
        ? parseFloat(String(raw.tare_deduction_kg))
        : null;
    if (tareKg != null && tareKg > 500) {
      tareKg = Number((tareKg / 1000).toFixed(3));
    }

    let netKasabKg =
      typeof raw.slipNetTotal === 'number'
        ? raw.slipNetTotal
        : typeof raw.net_kasab_kg === 'number'
        ? raw.net_kasab_kg
        : raw.slipNetTotal
        ? parseFloat(String(raw.slipNetTotal))
        : raw.net_kasab_kg
        ? parseFloat(String(raw.net_kasab_kg))
        : null;
    if (netKasabKg != null && netKasabKg > 500) {
      netKasabKg = Number((netKasabKg / 1000).toFixed(3));
    }

    const rawBags = Array.isArray(raw.bags) ? raw.bags : [];
    const normalizedBags: InwardBagExtraction[] = rawBags.map((bRaw: unknown, idx: number) => {
      const b = typeof bRaw === 'object' && bRaw !== null ? (bRaw as Record<string, unknown>) : {};
      let gross =
        typeof b.gross_weight === 'number'
          ? b.gross_weight
          : typeof b.gross === 'number'
          ? b.gross
          : typeof b.gross_kg === 'number'
          ? b.gross_kg
          : b.gross_weight
          ? parseFloat(String(b.gross_weight))
          : b.gross
          ? parseFloat(String(b.gross))
          : b.gross_kg
          ? parseFloat(String(b.gross_kg))
          : undefined;

      if (gross != null && gross > 500) {
        gross = Number((gross / 1000).toFixed(3));
      }

      let rola: number | undefined;
      let twistFromRola: 'S' | 'Z' | undefined;
      const rolaRaw = b.rola ?? b.rola_count ?? b.bungari;
      if (typeof rolaRaw === 'number') {
        rola = rolaRaw;
      } else if (rolaRaw != null && String(rolaRaw).trim() !== '') {
        const match = String(rolaRaw).match(/(\d+)\s*[-/]?\s*([SZsz]?)/);
        if (match) {
          rola = parseInt(match[1], 10);
          if (match[2]) {
            twistFromRola = match[2].toUpperCase() === 'Z' ? 'Z' : 'S';
          }
        }
      }

      // If twist (S/Z) is not explicitly handwritten on the challan slip, return null. Do not default or guess.
      const twistCandidate = b.twist || b.twistType || twistFromRola;
      let twist: 'S' | 'Z' | null = null;
      if (twistCandidate) {
        const tStr = String(twistCandidate).trim().toUpperCase();
        if (tStr.includes('Z')) {
          twist = 'Z';
        } else if (tStr.includes('S') || tStr.includes('C')) {
          twist = 'S';
        }
      } else {
        const desc = String(b.description || '').toUpperCase();
        if (desc.includes(' Z') || desc.endsWith('-Z') || desc.endsWith('Z')) {
          twist = 'Z';
        } else if (desc.includes(' S') || desc.endsWith('-S') || desc.endsWith('S') || desc.includes(' C')) {
          twist = 'S';
        }
      }

      // Note: If Gujarati note like "મોટા" appears next to a line, detect spool_type as "BIG".
      const allLineText = [
        b.spool_type,
        b.description,
        b.quality,
        b.notes,
        b.color,
        b.rolaType,
        b.sizeType,
        raw.rola_type,
      ]
        .filter(Boolean)
        .join(' ');
      const hasMotaGujarati = /મોટા|mota|mote|big/i.test(allLineText);
      const isBig = hasMotaGujarati || String(b.spool_type || b.rolaType || b.sizeType || raw.rola_type || '').toUpperCase().includes('BIG');
      const spool_type: 'NORMAL' | 'BIG' = isBig ? 'BIG' : 'NORMAL';
      const rolaType: 'NORM' | 'BIG' = isBig ? 'BIG' : 'NORM';
      const sizeType: 'Norm' | 'Big' = isBig ? 'Big' : 'Norm';

      // If color is not explicitly handwritten on the challan slip, return null. Do not default or guess.
      let color: string | null = null;
      const rawColor = b.color ?? b.quality;
      if (rawColor != null && String(rawColor).trim() !== '') {
        const colorCandidate = String(rawColor).trim();
        if (!/^[SZsz\d\s.-]+$/.test(colorCandidate) && !/^(મોટા|mota|mote|big|norm)$/i.test(colorCandidate)) {
          color = colorCandidate;
        }
      }

      const bagNo =
        typeof b.bag_number === 'number'
          ? b.bag_number
          : typeof b.bag_no === 'number'
          ? b.bag_no
          : idx + 1;

      return {
        bag_no: bagNo,
        gross,
        gross_kg: gross,
        gross_weight: gross,
        rola,
        rola_count: rola,
        color,
        twist,
        twistType: twist,
        spool_type,
        rolaType,
        sizeType,
      };
    });

    // Filter out rows that are mistakenly summary totals / deductions rather than individual bags
    const validBags = normalizedBags.filter((b) => {
      const g = Number(b.gross ?? b.gross_kg ?? 0);
      if (g <= 0) return false;

      // If bag gross equals total gross sum and multiple bags exist
      const totalGrossRef = grossKg;
      if (normalizedBags.length > 1 && totalGrossRef != null && Math.abs(g - totalGrossRef) < 0.005) {
        return false;
      }

      // If bag gross equals the sum of the remaining bags (it's the subtotal row)
      const otherBags = normalizedBags.filter((other) => other !== b);
      if (otherBags.length >= 2) {
        const otherBagsSum = otherBags.reduce(
          (acc, other) => acc + Number(other.gross ?? other.gross_kg ?? 0),
          0
        );
        if (otherBagsSum > 0 && Math.abs(g - otherBagsSum) < 0.01) {
          return false;
        }
      }

      // If bag gross equals the tare deduction weight (e.g. 50.020)
      if (tareKg != null && tareKg > 0 && Math.abs(g - tareKg) < 0.005) {
        return false;
      }

      // If bag gross equals the net kasab weight and multiple bags exist
      if (normalizedBags.length > 1 && netKasabKg != null && Math.abs(g - netKasabKg) < 0.005) {
        return false;
      }

      return true;
    });

    let finalBags = validBags.length > 0 ? validBags.map((b, i) => ({ ...b, bag_no: i + 1 })) : [];

    // Fallback: If no bags were extracted but gross or net exists, create 1 bag
    if (finalBags.length === 0 && ((grossKg != null && grossKg > 0) || (netKasabKg != null && netKasabKg > 0))) {
      const fallbackGross = grossKg != null && grossKg > 0 ? grossKg : netKasabKg!;
      finalBags = [
        {
          bag_no: 1,
          gross: fallbackGross,
          gross_kg: fallbackGross,
          gross_weight: fallbackGross,
          rola: typeof raw.rola_pcs === 'number' ? raw.rola_pcs : 0,
          rola_count: typeof raw.rola_pcs === 'number' ? raw.rola_pcs : 0,
          color: null,
          twist: null,
          twistType: null,
          spool_type: raw.rola_type === 'BIG' ? 'BIG' : 'NORMAL',
          rolaType: raw.rola_type === 'BIG' ? 'BIG' : 'NORM',
          sizeType: raw.rola_type === 'BIG' ? 'Big' : 'Norm',
        },
      ];
    }

    const sumBagGross = finalBags.reduce((acc, b) => acc + (b.gross ?? 0), 0);
    const sumBagRola = finalBags.reduce((acc, b) => acc + (b.rola ?? 0), 0);

    const finalGrossKg =
      grossKg != null && grossKg > 0
        ? grossKg
        : sumBagGross > 0
        ? Number(sumBagGross.toFixed(3))
        : null;

    const finalRolaPcs =
      typeof raw.rola_pcs === 'number'
        ? raw.rola_pcs
        : raw.rola_pcs
        ? parseInt(String(raw.rola_pcs), 10)
        : sumBagRola > 0
        ? sumBagRola
        : null;

    const finalBagsCount =
      finalBags.length > 0
        ? finalBags.length
        : typeof raw.bags_count === 'number'
        ? raw.bags_count
        : raw.bags_count
        ? parseInt(String(raw.bags_count), 10)
        : null;

    let finalNetKasabKg = netKasabKg;
    if (finalNetKasabKg == null && finalGrossKg != null && tareKg != null) {
      finalNetKasabKg = Number(Math.max(0, finalGrossKg - tareKg).toFixed(3));
    }

    const inward: InwardChallanData = {
      gross_kg: finalGrossKg,
      tare_deduction_kg: tareKg,
      net_kasab_kg: finalNetKasabKg,
      slipGrossTotal: finalGrossKg,
      slipTareTotal: tareKg,
      slipNetTotal: finalNetKasabKg,
      rola_pcs: finalRolaPcs,
      rola_type:
        raw.rola_type === 'NORMAL' || raw.rola_type === 'BIG'
          ? (raw.rola_type as 'NORMAL' | 'BIG')
          : null,
      bags_count: finalBagsCount,
      bags: finalBags.length > 0 ? finalBags : undefined,
    };

    return {
      challan_no: challanNo,
      challanNo,
      date,
      party_name: partyName,
      partyName,
      bags: inward.bags as unknown as Array<Record<string, unknown>>,
      inward_data: inward,
      notes: typeof raw.notes === 'string' ? raw.notes : null,
      raw_notes: typeof raw.notes === 'string' ? raw.notes : null,
    };
  } else {
    const defaultTarParsed = parseTarAndTwist(
      '',
      raw.default_tar || '10 Tar',
      raw.default_twist || 'S'
    );

    const rawValBags =
      Array.isArray(raw.val_bags) && raw.val_bags.length > 0
        ? raw.val_bags
        : Array.isArray(raw.bags)
        ? raw.bags
        : [];

    let normalizedBags: OutwardBagExtraction[] = rawValBags.map((b: unknown, idx: number) => {
      const bagObj = typeof b === 'object' && b !== null ? (b as Record<string, unknown>) : {};
      let gross =
        typeof bagObj.gross_weight === 'number'
          ? bagObj.gross_weight
          : typeof bagObj.gross === 'number'
          ? bagObj.gross
          : typeof bagObj.gross_kg === 'number'
          ? bagObj.gross_kg
          : bagObj.gross_weight
          ? parseFloat(String(bagObj.gross_weight))
          : bagObj.gross
          ? parseFloat(String(bagObj.gross))
          : bagObj.gross_kg
          ? parseFloat(String(bagObj.gross_kg))
          : 0;

      if (gross > 500) {
        gross = gross / 1000;
      }
      gross = Number(gross.toFixed(3));

      const tareWeight =
        typeof bagObj.tare_weight === 'number'
          ? bagObj.tare_weight
          : bagObj.tare_weight
          ? parseFloat(String(bagObj.tare_weight))
          : undefined;

      const netWeight =
        typeof bagObj.net_weight === 'number'
          ? bagObj.net_weight
          : bagObj.net_weight
          ? parseFloat(String(bagObj.net_weight))
          : undefined;

      let bungari =
        typeof bagObj.bungari === 'number'
          ? bagObj.bungari
          : typeof bagObj.bungari_pcs === 'number'
          ? bagObj.bungari_pcs
          : bagObj.bungari
          ? parseInt(String(bagObj.bungari), 10)
          : bagObj.bungari_pcs
          ? parseInt(String(bagObj.bungari_pcs), 10)
          : 0;

      const descStr = typeof bagObj.description === 'string' ? bagObj.description.trim() : '';
      if (!bungari && descStr) {
        const descMatch = descStr.match(/^(\d{1,2})\s+(\d{1,2})\s*([CSZ])/i);
        if (descMatch) {
          bungari = parseInt(descMatch[1], 10);
        }
      }

      // If bungari is missing or 0, deduce from tare weight if present
      if (!bungari && tareWeight != null && tareWeight > 0) {
        const tareKg = tareWeight > 500 ? tareWeight / 1000 : tareWeight;
        const deduced = Math.round((tareKg * 1000) / 70);
        if (deduced > 0) {
          bungari = deduced;
        }
      }

      const rawTar = bagObj.tar || bagObj.tar_rate || raw.default_tar || '';
      const rawTwist = bagObj.twistType || bagObj.twist || raw.default_twist || '';
      const parsed = parseTarAndTwist(String(bagObj.description || ''), rawTar, rawTwist);

      const bagRate =
        typeof bagObj.rate === 'number'
          ? bagObj.rate
          : bagObj.rate
          ? parseFloat(String(bagObj.rate))
          : undefined;

      const bagNumber =
        typeof bagObj.bag_number === 'number'
          ? bagObj.bag_number
          : typeof bagObj.bag_no === 'number'
          ? bagObj.bag_no
          : idx + 1;

      return {
        bag_no: bagNumber,
        bag_number: bagNumber,
        gross,
        gross_kg: gross,
        gross_weight: gross,
        tare_weight: tareWeight != null && tareWeight > 500 ? Number((tareWeight / 1000).toFixed(3)) : tareWeight,
        net_weight: netWeight != null && netWeight > 500 ? Number((netWeight / 1000).toFixed(3)) : netWeight,
        bungari,
        bungari_pcs: bungari,
        tar: parsed.tar,
        tar_rate: parsed.tar,
        twist: parsed.twist,
        twistType: parsed.twist,
        rate: bagRate,
        description: typeof bagObj.description === 'string' ? bagObj.description : undefined,
      };
    });

    // Parse empty rola returns from bottom section
    const rawEmptyRola = Array.isArray(raw.empty_rola_bags)
      ? raw.empty_rola_bags
      : Array.isArray((raw as Record<string, unknown>).empty_rola_list)
      ? ((raw as Record<string, unknown>).empty_rola_list as unknown[])
      : Array.isArray((raw as Record<string, unknown>).rola_bags)
      ? ((raw as Record<string, unknown>).rola_bags as unknown[])
      : [];

    const normalizedEmptyRola: EmptyRolaBagExtraction[] = rawEmptyRola
      .map((rRaw: unknown, idx: number) => {
        const r = typeof rRaw === 'object' && rRaw !== null ? (rRaw as Record<string, unknown>) : {};
        let gross =
          typeof r.gross === 'number'
            ? r.gross
            : typeof r.gross_kg === 'number'
            ? r.gross_kg
            : typeof r.gross_weight === 'number'
            ? r.gross_weight
            : typeof r.weight_kg === 'number'
            ? r.weight_kg
            : typeof r.weight === 'number'
            ? r.weight
            : r.gross
            ? parseFloat(String(r.gross))
            : r.gross_kg
            ? parseFloat(String(r.gross_kg))
            : r.gross_weight
            ? parseFloat(String(r.gross_weight))
            : r.weight_kg
            ? parseFloat(String(r.weight_kg))
            : r.weight
            ? parseFloat(String(r.weight))
            : 0;

        if (gross > 500) {
          gross = gross / 1000;
        }
        gross = Number(gross.toFixed(3));

        const rola =
          typeof r.rola === 'number'
            ? r.rola
            : typeof r.rola_count === 'number'
            ? r.rola_count
            : typeof r.quantity === 'number'
            ? r.quantity
            : typeof r.pcs === 'number'
            ? r.pcs
            : r.rola
            ? parseInt(String(r.rola), 10)
            : r.rola_count
            ? parseInt(String(r.rola_count), 10)
            : r.quantity
            ? parseInt(String(r.quantity), 10)
            : r.pcs
            ? parseInt(String(r.pcs), 10)
            : 0;

        const isTotal =
          Boolean(r.is_total) ||
          String(r.description || '').toLowerCase().includes('total') ||
          String(r.tag || '').toLowerCase().includes('total');

        const bagNumber =
          typeof r.bag_number === 'number'
            ? r.bag_number
            : typeof r.bag_no === 'number'
            ? r.bag_no
            : idx + 1;

        return {
          bag_no: bagNumber,
          bag_number: bagNumber,
          gross,
          gross_kg: gross,
          gross_weight: gross,
          rola,
          rola_count: rola,
          is_total: isTotal,
        };
      })
      .filter((r) => !r.is_total && (r.gross > 0 || r.rola > 0));

    // Separate upper finished goods (val_bags) from lower return lots (empty_rola_bags) based on divider
    const separatedValBags: OutwardBagExtraction[] = [];
    for (const b of normalizedBags) {
      const bObj = b as unknown as Record<string, unknown>;
      const isTotalLine =
        Boolean(bObj.is_total) ||
        String(b.description || '').toLowerCase().includes('total');
      const desc = String(b.description || '').toLowerCase();
      const hasRolaKeyword =
        desc.includes('rola') ||
        desc.includes('khali') ||
        desc.includes('empty') ||
        desc.includes('return') ||
        desc.includes('roller');
      const hasExplicitRolaCount = Boolean((Number(bObj.rola_count) || 0) > 0 || (Number(bObj.rola) || 0) > 0);
      const hasFinishedAttributes = Boolean((b.bungari && b.bungari > 0) || (b.tar && Number(b.tar) > 0) || b.twist);

      // Explicitly classify as Rola only by keyword or rola count without finished goods attributes
      const isRolaLike = (hasRolaKeyword || hasExplicitRolaCount) && !hasFinishedAttributes;

      if (isTotalLine) {
        continue;
      } else if (isRolaLike && ((Number(bObj.rola_count) || 0) > 0 || (Number(bObj.rola) || 0) > 0 || (b.gross || 0) > 0)) {
        normalizedEmptyRola.push({
          bag_no: normalizedEmptyRola.length + 1,
          bag_number: normalizedEmptyRola.length + 1,
          gross: b.gross || 0,
          gross_kg: b.gross || 0,
          gross_weight: b.gross || 0,
          rola: Number(bObj.rola) || Number(bObj.rola_count) || 0,
          rola_count: Number(bObj.rola) || Number(bObj.rola_count) || 0,
          is_total: false,
        });
      } else {
        separatedValBags.push(b);
      }
    }
    normalizedBags = separatedValBags;

    // Filter out summary/total line from val_bags if last item equals sum of previous items
    if (normalizedBags.length > 1) {
      const last = normalizedBags[normalizedBags.length - 1];
      const prevGrossSum = normalizedBags.slice(0, -1).reduce((sum, x) => sum + (x.gross || 0), 0);
      if (Math.abs((last.gross || 0) - prevGrossSum) < 0.05 && prevGrossSum > 0) {
        normalizedBags = normalizedBags.slice(0, -1);
      }
    }

    // If the last item of empty rola equals the sum of previous items, it's the subtotal row
    let cleanedEmptyRola = normalizedEmptyRola;
    if (cleanedEmptyRola.length > 1) {
      const last = cleanedEmptyRola[cleanedEmptyRola.length - 1];
      const prevGrossSum = cleanedEmptyRola.slice(0, -1).reduce((sum, x) => sum + x.gross, 0);
      const prevRolaSum = cleanedEmptyRola.slice(0, -1).reduce((sum, x) => sum + x.rola, 0);
      if (
        (Math.abs(last.gross - prevGrossSum) < 0.05 && prevGrossSum > 0) ||
        (last.rola === prevRolaSum && prevRolaSum > 0)
      ) {
        cleanedEmptyRola = cleanedEmptyRola.slice(0, -1);
      }
    }

    const rawSettlement =
      typeof raw.settlement === 'object' && raw.settlement !== null
        ? (raw.settlement as Record<string, unknown>)
        : null;

    const slipGrossTotal =
      rawSettlement?.slipGross != null
        ? Number(rawSettlement.slipGross)
        : typeof raw.slipGrossTotal === 'number'
        ? raw.slipGrossTotal
        : raw.slipGrossTotal
        ? parseFloat(String(raw.slipGrossTotal))
        : null;

    const slipTareTotal =
      rawSettlement?.slipTare != null
        ? Number(rawSettlement.slipTare)
        : typeof raw.slipTareTotal === 'number'
        ? raw.slipTareTotal
        : typeof raw.tare_total_kg === 'number'
        ? raw.tare_total_kg
        : raw.slipTareTotal
        ? parseFloat(String(raw.slipTareTotal))
        : raw.tare_total_kg
        ? parseFloat(String(raw.tare_total_kg))
        : null;

    const slipNetTotal =
      rawSettlement?.slipNet != null
        ? Number(rawSettlement.slipNet)
        : typeof raw.slipNetTotal === 'number'
        ? raw.slipNetTotal
        : typeof raw.net_total_kg === 'number'
        ? raw.net_total_kg
        : typeof raw.net_val_kg === 'number'
        ? raw.net_val_kg
        : raw.slipNetTotal
        ? parseFloat(String(raw.slipNetTotal))
        : raw.net_total_kg
        ? parseFloat(String(raw.net_total_kg))
        : raw.net_val_kg
        ? parseFloat(String(raw.net_val_kg))
        : null;

    const slipAmount =
      rawSettlement?.slipAmount != null
        ? Number(rawSettlement.slipAmount)
        : typeof raw.slipAmount === 'number'
        ? raw.slipAmount
        : typeof raw.grand_total_amount === 'number'
        ? raw.grand_total_amount
        : typeof raw.total_amount === 'number'
        ? raw.total_amount
        : raw.slipAmount
        ? parseFloat(String(raw.slipAmount))
        : raw.grand_total_amount
        ? parseFloat(String(raw.grand_total_amount))
        : raw.total_amount
        ? parseFloat(String(raw.total_amount))
        : null;

    const defaultRate =
      rawSettlement?.slipRate != null
        ? Number(rawSettlement.slipRate)
        : typeof raw.default_rate === 'number'
        ? raw.default_rate
        : typeof raw.rate_per_kg === 'number'
        ? raw.rate_per_kg
        : raw.default_rate
        ? parseFloat(String(raw.default_rate))
        : raw.rate_per_kg
        ? parseFloat(String(raw.rate_per_kg))
        : 20;

    // Filter out rows that are mistakenly settlement totals rather than individual bags
    const validBags = normalizedBags.filter((b) => {
      const gross = Number(b.gross ?? b.gross_kg ?? 0);
      if (gross <= 0) return false;
      // If a bag gross is >= 500, it's a rupee amount misclassified as weight
      if (gross >= 500) return false;
      // If bag gross equals the final slipAmount or slipAmount / 1000
      if (slipAmount != null && slipAmount > 0) {
        if (Math.abs(gross - slipAmount) < 0.01) return false;
        if (Math.abs(gross - slipAmount / 1000) < 0.005 && slipGrossTotal != null && slipGrossTotal > 5) {
          return false;
        }
      }
      // If bag gross equals total gross and there are multiple bags
      const totalGrossRef = slipGrossTotal ?? (raw.total_gross_weight != null ? Number(raw.total_gross_weight) : null);
      if (normalizedBags.length > 1 && totalGrossRef != null && Math.abs(gross - totalGrossRef) < 0.005) {
        return false;
      }
      // If this bag's gross matches the sum of the remaining bags
      const otherBagsSum = normalizedBags
        .filter((other) => other !== b)
        .reduce((acc, other) => acc + Number(other.gross ?? other.gross_kg ?? 0), 0);
      if (otherBagsSum > 0 && Math.abs(gross - otherBagsSum) < 0.01) {
        return false;
      }
      return true;
    });

    if (validBags.length > 0) {
      normalizedBags = validBags.map((b, i) => ({ ...b, bag_no: i + 1 }));
    }

    // Fallback: If no finished val bags were extracted and no empty rola bags, but net or gross weight exists, create 1 bag
    if (
      normalizedBags.length === 0 &&
      cleanedEmptyRola.length === 0 &&
      ((slipNetTotal != null && slipNetTotal > 0) || (slipGrossTotal != null && slipGrossTotal > 0))
    ) {
      const fallbackWeight = (slipGrossTotal && slipGrossTotal < 500) ? slipGrossTotal : (slipNetTotal && slipNetTotal < 500) ? slipNetTotal : 0;
      if (fallbackWeight > 0) {
        normalizedBags = [
          {
            bag_no: 1,
            gross: fallbackWeight,
            gross_kg: fallbackWeight,
            bungari: 0,
            bungari_pcs: 0,
            tar: defaultTarParsed.tar,
            tar_rate: defaultTarParsed.tar,
            twist: defaultTarParsed.twist,
            twistType: defaultTarParsed.twist,
          },
        ];
      }
    }

    const sumEmptyRolaGross = cleanedEmptyRola.reduce((acc, r) => acc + (r.gross || 0), 0);
    const sumEmptyRolaPcs = cleanedEmptyRola.reduce((acc, r) => acc + (r.rola || 0), 0);

    const rolaWeightKg =
      typeof raw.rola_weight_kg === 'number'
        ? raw.rola_weight_kg
        : raw.rola_weight_kg
        ? parseFloat(String(raw.rola_weight_kg))
        : sumEmptyRolaGross > 0
        ? Number(sumEmptyRolaGross.toFixed(3))
        : null;

    const rolaReturnedPcs =
      typeof raw.rola_returned_pcs === 'number'
        ? raw.rola_returned_pcs
        : raw.rola_returned_pcs
        ? parseInt(String(raw.rola_returned_pcs), 10)
        : sumEmptyRolaPcs > 0
        ? sumEmptyRolaPcs
        : null;

    const outward: OutwardChallanData = {
      dispatch_type: raw.dispatch_type === 'ROLA_EMPTY' ? 'ROLA_EMPTY' : 'VAL_FINISHED',
      party_name: partyName,
      challan_no: challanNo,
      date,
      default_rate: defaultRate,
      default_tar: defaultTarParsed.tar,
      default_twist: defaultTarParsed.twist,
      val_bags: normalizedBags,
      bags: normalizedBags,
      empty_rola_bags: cleanedEmptyRola,
      settlement: {
        slipGross: slipGrossTotal,
        slipTare: slipTareTotal,
        slipNet: slipNetTotal,
        slipRate: defaultRate,
        slipAmount: slipAmount,
      },
      slipGrossTotal,
      slipTareTotal,
      slipNetTotal,
      slipAmount,
      tare_total_kg: slipTareTotal,
      net_total_kg: slipNetTotal,
      grand_total_amount: slipAmount,
      net_val_kg: slipNetTotal,
      rola_weight_kg: rolaWeightKg,
      rola_returned_pcs: rolaReturnedPcs,
      rate_per_kg: defaultRate,
      total_amount: slipAmount,
    };

    return {
      challan_no: challanNo,
      challanNo,
      date,
      party_name: partyName,
      partyName,
      bags: outward.bags as unknown as Array<Record<string, unknown>>,
      val_bags: outward.val_bags,
      empty_rola_bags: outward.empty_rola_bags,
      outward_data: outward,
      notes: typeof raw.notes === 'string' ? raw.notes : null,
      raw_notes: typeof raw.notes === 'string' ? raw.notes : null,
    };
  }
}
