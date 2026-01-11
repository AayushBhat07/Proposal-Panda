/**
 * Chapter Generator Service
 * Handles chapter-specific generation logic with templates and AI
 */

import { generateWithLlmSafe } from './localLlmService';
import { GLOBAL_SYSTEM_PROMPT } from './generationInstruction';
import type { 
  ChapterId, 
  TenderInputForm, 
  ChapterGenerationResult 
} from '../types/chapterGeneration.types';
import { getChapterMetadata } from '../config/chapterConfig';

/**
 * Generate Chapter 01: Tender Notice (TEMPLATE)
 */
function generateChapter01(inputForm: TenderInputForm): string {
  const { nameOfWork, authority, location, estimatedCost, timeForCompletion, emd, contractType } = inputForm;
  
  return `CHAPTER 01: TENDER NOTICE

Tender Reference: TN/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}

1. TENDER ISSUING AUTHORITY
   ${authority}
   ${location}

2. NAME OF WORK
   ${nameOfWork}

3. ESTIMATED COST
   Rs. ${estimatedCost.toLocaleString('en-IN')}

4. EARNEST MONEY DEPOSIT (EMD)
   Rs. ${emd.toLocaleString('en-IN')}

5. TIME FOR COMPLETION
   ${timeForCompletion} months from the date of commencement

6. CONTRACT TYPE
   ${contractType}

7. SUBMISSION DETAILS
   Tenders must be submitted online through the official tender portal.
   Last date for submission: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}

8. PRE-BID MEETING
   Date: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}
   Venue: Office of ${authority}, ${location}

9. CONTACT INFORMATION
   For queries, contact: ${authority}
   Email: tenders@${authority.toLowerCase().replace(/\s+/g, '')}.gov.in

Note: This is a preliminary notice. Detailed terms and conditions are available in subsequent chapters.`;
}

/**
 * Generate Chapter 02: Detailed Tender Notice (AI_GENERATE)
 * Phase 3A: Upgraded with authentic Maharashtra PWD-style content
 */
async function generateChapter02(inputForm: TenderInputForm): Promise<ChapterGenerationResult> {
  const { nameOfWork, authority, location, estimatedCost, timeForCompletion, contractorClass, securityDepositPercent, emd, contractType } = inputForm;
  
  const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}

You are generating Chapter 02: Detailed Tender Notice for a Maharashtra Public Works Department (PWD) infrastructure tender.

CRITICAL TONE AND LANGUAGE REQUIREMENTS:
- Use formal, conservative, government-bureaucratic language
- Employ passive voice heavily ("The tenderer shall...", "It shall be ensured that...")
- Write in a legally serious, non-conversational manner
- Use repetitive, formal PWD-style phrasing
- NO marketing language or corporate tone whatsoever
- Include phrases like:
  * "The tenderer shall..."
  * "No extra claim whatsoever shall be entertained..."
  * "The decision of the Executive Engineer shall be final and binding..."
  * "Rates quoted shall be inclusive of all taxes, duties, royalties, cess, etc..."
  * "as per applicable rules"
  * "in accordance with the provisions of..."

LEGAL AND DOMAIN CONSTRAINTS:
- DO NOT invent specific laws or acts
- Use generic phrases like "as per applicable rules" or "as per government norms"
- Use realistic authority hierarchy: Executive Engineer → Superintending Engineer → Chief Engineer
- Keep financial and legal terms conservative and standard
- Avoid exact regulatory numbers unless universally applicable

STRUCTURE REQUIREMENTS:
- Generate 20 numbered clauses or sections
- Each clause must be formal, clear, and legally sound
- Format with proper numbering (1., 2., 3., etc.)
- Write comprehensive but not verbose content
- Ensure professional tender document authenticity`;

  const userPrompt = `Generate a comprehensive Detailed Tender Notice (Chapter 02) for the following Maharashtra PWD infrastructure project:

Project Details:
- Name of Work: ${nameOfWork}
- Authority: ${authority}
- Location: ${location}
- Estimated Cost: Rs. ${estimatedCost.toLocaleString('en-IN')}
- Period of Completion: ${timeForCompletion} months
- Contractor Class Required: ${contractorClass}
- Security Deposit: ${securityDepositPercent}% of contract value
- Earnest Money Deposit (EMD): Rs. ${emd.toLocaleString('en-IN')}
- Contract Type: ${contractType}

Generate EXACTLY the following 20 clauses/sections in formal Maharashtra PWD style:

1. INVITATION OF TENDER
2. NAME OF WORK
3. ESTIMATED COST
4. EARNEST MONEY DEPOSIT (EMD)
5. TENDER FEE
6. PERIOD OF COMPLETION
7. ELIGIBILITY CRITERIA
8. CLASS OF CONTRACTOR
9. EXPERIENCE REQUIREMENTS
10. AVAILABILITY OF TENDER DOCUMENTS
11. SUBMISSION OF TENDER
12. OPENING OF TENDER
13. VALIDITY OF TENDER
14. SECURITY DEPOSIT / PERFORMANCE SECURITY
15. TAXES, DUTIES, ROYALTIES
16. AUTHORITY OF DEPARTMENTAL OFFICERS
17. RIGHT TO REJECT TENDERS
18. CONDITIONAL TENDERS
19. JURISDICTION / ARBITRATION
20. FINALITY OF DECISION

IMPORTANT FORMATTING:
- Number each section clearly (1., 2., 3., etc.)
- Write in passive, formal government language
- Keep each section clear but comprehensive
- Use proper PWD terminology and phrases
- Ensure legal seriousness throughout

Do NOT include chapter heading ("CHAPTER 02") - I will add that. Start directly with section 1.`;

  const result = await generateWithLlmSafe({
    systemPrompt,
    userPrompt,
    inferenceOptions: {
      temperature: 0.2,  // Lower temperature for more formal, consistent output
      top_p: 0.85,        // Slightly lower for more conservative language
      repeat_penalty: 1.15, // Higher penalty to reduce repetition
      max_tokens: 3072,   // Increased for 20 comprehensive clauses
    },
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  return {
    success: true,
    content: `CHAPTER 02: DETAILED TENDER NOTICE\n\n${result.data.content}`,
    tokenCount: result.data.tokenCount,
    responseTimeMs: result.data.responseTimeMs,
  };
}

/**
 * Generate Chapter 03: Agreement Form B-1 (TEMPLATE_FILL)
 */
function generateChapter03(inputForm: TenderInputForm): string {
  const { nameOfWork, authority, location, contractType, estimatedCost } = inputForm;
  
  return `CHAPTER 03: AGREEMENT FORM B-1

ARTICLES OF AGREEMENT

THIS AGREEMENT made on this _____ day of __________ 20___

BETWEEN

The ${authority} (hereinafter called "the Employer") of the one part

AND

_________________________ (hereinafter called "the Contractor") of the other part

WHEREAS the Employer is desirous of executing the work: "${nameOfWork}" at ${location} and has accepted the tender submitted by the Contractor for execution of such work.

NOW THIS AGREEMENT WITNESSETH as follows:

1. In this Agreement, words and expressions shall have the same meanings as are respectively assigned to them in the Conditions of Contract hereinafter referred to.

2. The following documents shall be deemed to form and be read and construed as part of this Agreement:
   (a) Letter of Acceptance
   (b) Notice to proceed with the work
   (c) Tender and Acceptance thereof
   (d) General Conditions of Contract
   (e) Special Conditions of Contract
   (f) Specifications
   (g) Drawings
   (h) Bill of Quantities
   (i) Any other documents listed in the Contract Data

3. Contract Type: ${contractType}

4. Contract Value: Rs. ${estimatedCost.toLocaleString('en-IN')} (Subject to adjustment as per contract terms)

5. In consideration of the payments to be made by the Employer to the Contractor as hereinafter mentioned, the Contractor hereby covenants with the Employer to execute and complete the works and remedy the defects therein in conformity in all respects with the provisions of the Contract.

6. The Employer hereby covenants to pay the Contractor in consideration of the execution and completion of the works and the remedying of defects therein, the Contract Price or such other sum as may become payable under the provisions of the Contract at the times and in the manner prescribed by the Contract.

IN WITNESS whereof the parties hereto have caused this Agreement to be executed the day and year first before written.

Signed, Sealed and Delivered
For and on behalf of the Employer

Signature: _______________________
Name: __________________________
Designation: ____________________
Date: ___________________________

For and on behalf of the Contractor

Signature: _______________________
Name: __________________________
Designation: ____________________
Date: ___________________________

In the presence of witnesses:

Witness 1:
Signature: _______________________
Name: __________________________
Address: ________________________

Witness 2:
Signature: _______________________
Name: __________________________
Address: ________________________`;
}

/**
 * Generate Chapter 04: Additional GCC (AI_GENERATE - STRICT)
 */
async function generateChapter04(inputForm: TenderInputForm): Promise<ChapterGenerationResult> {
  const { nameOfWork, timeForCompletion, securityDepositPercent, contractType } = inputForm;
  
  const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}

You are generating Chapter 04: Additional General Conditions of Contract for an Indian infrastructure tender.

CRITICAL CONSTRAINTS:
- Generate ONLY clause-based content
- Reference standard GCC patterns from PWD/CPWD
- DO NOT invent financial penalties or legal obligations
- Use numbered clauses (4.1, 4.2, etc.)
- Keep clauses project-specific but legally conservative
- Each clause must be clear and enforceable`;

  const userPrompt = `Generate Additional General Conditions of Contract for:

Project: ${nameOfWork}
Contract Type: ${contractType}
Completion Period: ${timeForCompletion} months
Security Deposit: ${securityDepositPercent}%

Generate clauses covering:
1. Project-specific obligations and contractor responsibilities
2. Quality assurance and inspection procedures
3. Safety requirements and site management
4. Payment terms (milestone-based, retention, final payment)
5. Time extension provisions
6. Liquidated damages framework (general structure only)
7. Dispute resolution mechanism

Format as numbered clauses (4.1, 4.2, etc.) following Indian contract standards.`;

  const result = await generateWithLlmSafe({
    systemPrompt,
    userPrompt,
    inferenceOptions: {
      temperature: 0.2,
      top_p: 0.9,
      repeat_penalty: 1.15,
      max_tokens: 2048,
    },
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  return {
    success: true,
    content: `CHAPTER 04: ADDITIONAL GENERAL CONDITIONS OF CONTRACT\n\n${result.data.content}`,
    tokenCount: result.data.tokenCount,
    responseTimeMs: result.data.responseTimeMs,
  };
}

/**
 * Generate Chapter 05: General Notes (AI_GENERATE)
 */
async function generateChapter05(inputForm: TenderInputForm): Promise<ChapterGenerationResult> {
  const { nameOfWork, authority, location } = inputForm;
  
  const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}

You are generating Chapter 05: General Notes Regarding Material & Schedule A for an Indian infrastructure tender.

Focus on:
- Material specifications and sourcing guidelines
- Schedule A (quantities and descriptions)
- Quality standards and testing requirements
- Administrative instructions for bidders`;

  const userPrompt = `Generate General Notes and Schedule A information for:

Project: ${nameOfWork}
Authority: ${authority}
Location: ${location}

Include:
1. Document interpretation guidelines
2. Material specifications and approved sources
3. Quality control and testing procedures
4. Site visit and clarification process
5. Bid submission format and checklist
6. Verification and compliance procedures

Format as Chapter 05 with clear sections and subsections.`;

  const result = await generateWithLlmSafe({
    systemPrompt,
    userPrompt,
    inferenceOptions: {
      temperature: 0.25,
      top_p: 0.9,
      repeat_penalty: 1.1,
      max_tokens: 2048,
    },
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  return {
    success: true,
    content: `CHAPTER 05: GENERAL NOTES REGARDING MATERIAL & SCHEDULE A\n\n${result.data.content}`,
    tokenCount: result.data.tokenCount,
    responseTimeMs: result.data.responseTimeMs,
  };
}

/**
 * Generate Chapter 06: Schedule B (USER_UPLOAD_AI_NOTES)
 */
function generateChapter06(_inputForm: TenderInputForm): string {
  return `CHAPTER 06: SCHEDULE 'B'

BILL OF QUANTITIES

Note: This chapter requires user-uploaded Bill of Quantities.

Status: PENDING USER INPUT

Instructions:
- Upload detailed Bill of Quantities (BoQ) in prescribed format
- Include item descriptions, units, quantities, and rates
- Ensure compliance with Schedule A specifications
- AI will add technical notes after upload

Once uploaded, this chapter will include:
1. Complete Bill of Quantities
2. AI-generated technical notes
3. Rate analysis references
4. Material specifications cross-reference`;
}

/**
 * Generate Chapter 07: Additional Specifications (AI_GENERATE)
 * Phase 3C: Enhanced with PWD-style technical realism and execution-level detail
 */
async function generateChapter07(inputForm: TenderInputForm): Promise<ChapterGenerationResult> {
  const { nameOfWork, state } = inputForm;
  
  const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}

You are generating Chapter 07: Additional Specifications for a Maharashtra Public Works Department (PWD) infrastructure tender.

CRITICAL TONE AND LANGUAGE REQUIREMENTS:
- Use formal, conservative, execution-focused language
- Write in repetitive, directive PWD style (this is GOOD)
- Employ passive voice heavily ("The contractor shall...", "All materials shall...")
- Sound boring and technical (this is the goal)
- NO marketing language, NO modern buzzwords, NO academic tone
- Use repetitive formal phrases intentionally:
  * "The contractor shall make his own arrangements for..."
  * "All materials used shall be of approved quality and conform to..."
  * "No extra payment whatsoever shall be made for..."
  * "Work shall be carried out as directed by the Engineer-in-Charge..."
  * "Rates quoted shall be deemed to include all..."
  * "as per relevant IS specifications"
  * "as per standard PWD practices"

TECHNICAL REALISM GUARDRAILS:
- DO NOT invent specific IS codes unless very common (you may mention IS 456 cautiously)
- Use safe generic phrases: "as per relevant IS specifications", "as per applicable standards"
- DO NOT mention brand names or proprietary products
- Keep technical details realistic and execution-focused
- Avoid overly precise numbers unless standard practice
- Focus on HOW work will be done, not theoretical concepts

STRUCTURE REQUIREMENTS:
- Generate comprehensive subsections covering all execution aspects
- Each subsection must be 1-2 solid paragraphs minimum
- Total content should be substantial (multi-page in final document)
- Use numbered sections (7.1, 7.2, etc.)
- Include exhaustive coverage even if repetitive

REQUIRED SUBSECTIONS (must cover all):
1. General
2. Materials
3. Workmanship
4. Cement
5. Aggregates
6. Reinforcement Steel
7. Concrete Mixing & Placing
8. Formwork & Centering
9. Curing of Concrete
10. Measurements & Tolerances
11. Quality Control & Testing
12. Safety Provisions
13. Site Clearance & Housekeeping
14. Stacking & Storage of Materials
15. Water Supply & Power
16. Responsibility of Contractor

You may adjust subsection names slightly but must maintain comprehensive technical coverage.`;

  const userPrompt = `Generate Chapter 07: Additional Specifications for the following Maharashtra PWD infrastructure project:

Project: ${nameOfWork}
State: ${state}

Generate COMPREHENSIVE, EXECUTION-FOCUSED specifications organized into the following subsections:

7.1 GENERAL
- Scope of additional specifications
- Relationship to other contract documents
- Contractor's responsibility for compliance
- Engineer-in-Charge authority and approval requirements
- Definition of "approved quality" and "as directed"

7.2 MATERIALS
- General requirements for all materials
- Source approval procedures
- Quality standards and conformance requirements
- Substitution and alternative materials policy
- Contractor's responsibility for material quality
- Storage and handling requirements

7.3 WORKMANSHIP
- General workmanship standards
- Skilled labor requirements
- Supervision and quality control by contractor
- Rejection and re-execution of defective work
- Rates deemed inclusive of proper workmanship

7.4 CEMENT
- Types of cement approved for use (reference relevant IS specifications)
- Quality requirements and testing
- Storage conditions and shelf life
- Handling and protection from moisture
- Rejected cement disposal

7.5 AGGREGATES
- Coarse and fine aggregates specifications
- Quality requirements (reference relevant standards)
- Gradation, strength, and durability requirements
- Testing procedures and frequency
- Source approval and contractor's arrangements

7.6 REINFORCEMENT STEEL
- Types and grades of steel permitted
- Quality conformance (reference applicable standards)
- Storage, cutting, bending, and placement
- Cover requirements and tolerances
- Inspection and approval before concreting

7.7 CONCRETE MIXING & PLACING
- Mixing procedures and equipment
- Water-cement ratio control
- Transportation and placement methods
- Compaction and vibration requirements
- Hot and cold weather concreting precautions
- Rates inclusive of all mixing and placing operations

7.8 FORMWORK & CENTERING
- Design and construction of formwork
- Material specifications for formwork
- Alignment, level, and dimensional tolerances
- Removal procedures and timing
- Contractor's responsibility for formwork design adequacy

7.9 CURING OF CONCRETE
- Curing methods and duration
- Water requirements for curing
- Protection against premature drying
- Special curing for different structural elements
- No extra payment for curing arrangements

7.10 MEASUREMENTS & TOLERANCES
- Permissible dimensional tolerances
- Measurement procedures for payment
- Level and alignment verification
- Rectification of out-of-tolerance work
- Final measurements subject to Engineer-in-Charge approval

7.11 QUALITY CONTROL & TESTING
- Testing frequency and procedures
- Cube testing, material testing requirements
- Contractor's responsibility for testing arrangements
- Testing at approved laboratories
- Acceptance criteria and rejection procedures
- Cost of all testing borne by contractor

7.12 SAFETY PROVISIONS
- Site safety management requirements
- Personal protective equipment requirements
- Scaffolding and temporary works safety
- Safety signage and barriers
- Contractor's responsibility for all safety measures
- Compliance with applicable safety regulations

7.13 SITE CLEARANCE & HOUSEKEEPING
- Daily site cleaning requirements
- Disposal of construction waste
- Debris removal and site tidiness
- Final site clearance before handover
- Rates include all clearance and housekeeping

7.14 STACKING & STORAGE OF MATERIALS
- Proper stacking and storage requirements
- Protection from weather and damage
- Organized material yard maintenance
- Security arrangements by contractor
- Damaged materials replacement at contractor's cost

7.15 WATER SUPPLY & POWER
- Contractor's arrangements for water supply
- Power supply and temporary connections
- Costs deemed included in rates
- Approval requirements for connections
- Conservation and responsible usage

7.16 RESPONSIBILITY OF CONTRACTOR
- Overall responsibility for specification compliance
- Liability for defective work and materials
- Rectification at contractor's cost
- No extra claims for specification compliance
- Finality of Engineer-in-Charge decisions
- Deemed knowledge of site conditions and specifications

IMPORTANT FORMATTING:
- Number each section clearly (7.1, 7.2, 7.3, etc.)
- Write in formal, directive, repetitive PWD style
- Each section must be comprehensive (1-2+ paragraphs)
- Use conservative technical language
- Include execution-level instructions
- Emphasize contractor responsibilities and "no extra payment" clauses
- Sound boring and bureaucratic (this is correct)

Do NOT include chapter heading ("CHAPTER 07") - I will add that. Start directly with section 7.1.`;

  const result = await generateWithLlmSafe({
    systemPrompt,
    userPrompt,
    inferenceOptions: {
      temperature: 0.15,  // Lower temperature for more formal, consistent output
      top_p: 0.85,        // Lower for conservative language
      repeat_penalty: 1.05, // Lower penalty - we WANT repetitive PWD phrasing
      max_tokens: 4096,   // Increased for comprehensive multi-section content
    },
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  return {
    success: true,
    content: `CHAPTER 07: ADDITIONAL SPECIFICATIONS\n\n${result.data.content}`,
    tokenCount: result.data.tokenCount,
    responseTimeMs: result.data.responseTimeMs,
  };
}

/**
 * Generate Chapter 08: Proforma of Bonds & Circulars (TEMPLATE_FILL)
 * Phase 3D: Enhanced with PWD legal realism, authentic bond structures, and conservative legal language
 */
function generateChapter08(inputForm: TenderInputForm): string {
  const { authority, estimatedCost, securityDepositPercent, emd, nameOfWork, timeForCompletion } = inputForm;
  
  const securityAmount = Math.round(estimatedCost * (securityDepositPercent / 100));
  const emdAmount = emd;
  const validityMonths = timeForCompletion + 6; // Completion period + defect liability
  
  return `CHAPTER 08: PROFORMA OF BONDS, GUARANTEES & CIRCULARS

8.1 EARNEST MONEY DEPOSIT (EMD) BOND – PROFORMA

To,
The Executive Engineer,
${authority}

REFERENCE: Tender No. __________ dated __________
Work: ${nameOfWork}

WHEREAS _________________________________ (Name of Contractor) having its registered office at _________________________________ (Address) (hereinafter called "the Contractor" which expression shall unless repugnant to the context or meaning thereof include its successors, administrators and permitted assigns) has submitted a tender dated __________ for execution of the work mentioned above;

AND WHEREAS it is one of the conditions of the said tender that the Contractor shall deposit with the aforesaid authority a sum of Rs. ${emdAmount.toLocaleString('en-IN')} (Rupees _________________________________ only) as Earnest Money Deposit for due performance and fulfillment of the tender conditions;

AND WHEREAS we, _________________________________ (Name of Bank), a banking company within the meaning of the Banking Regulation Act, 1949, and having its branch office at _________________________________ (hereinafter called "the Bank") have agreed to furnish this Bank Guarantee on behalf of the said Contractor;

NOW THIS GUARANTEE WITNESSETH that the Bank hereby unconditionally and irrevocably guarantees and undertakes to pay on demand to the Executive Engineer, ${authority} without any demur, reservation, recourse or protest, and without reference to the Contractor, such sum or sums not exceeding Rs. ${emdAmount.toLocaleString('en-IN')} (Rupees _________________________________ only) as the Executive Engineer may demand in writing.

This guarantee shall remain valid and binding upon the Bank until such time the tender is accepted and the Contractor furnishes the required Performance Security, or until the tender is rejected, or until the Earnest Money Deposit is refunded to the Contractor as per the tender conditions, whichever is earlier.

The decision of the Executive Engineer regarding the invocation and encashment of this guarantee shall be final and binding on the Bank.

The Bank further agrees that this guarantee shall be a continuing guarantee and shall remain in full force and effect till the obligations of the Contractor under the tender documents are fully discharged.

NOTWITHSTANDING anything contained herein:

1. The Bank's liability under this guarantee shall not exceed Rs. ${emdAmount.toLocaleString('en-IN')}.

2. This guarantee shall not be discharged or affected by any change in the constitution of the Contractor or the Bank.

3. The Bank shall not be released of its obligations under this guarantee by any exercise or non-exercise of any right, power or remedy by the Executive Engineer.

4. This guarantee shall be valid up to __________ (date) and shall be extended, if required, on receipt of written request from the Contractor.

IN WITNESS WHEREOF the Bank, through its authorized official, has set and subscribed its hand on this _____ day of __________ 20___.

For and on behalf of the Bank:

Signature: _______________________
Name: ___________________________
Designation: _____________________
Bank Seal: _______________________
Branch: __________________________
Date: ____________________________

Witnesses:

1. Signature: _____________________
   Name: _________________________
   Address: _______________________
   
2. Signature: _____________________
   Name: _________________________
   Address: _______________________

---

8.2 PERFORMANCE SECURITY / PERFORMANCE GUARANTEE – PROFORMA

To,
The Executive Engineer,
${authority}

REFERENCE: Agreement No. __________ dated __________
Work: ${nameOfWork}
Contract Value: Rs. ${estimatedCost.toLocaleString('en-IN')}

WHEREAS _________________________________ (Name of Contractor) having its registered office at _________________________________ (Address) (hereinafter called "the Contractor") has entered into an Agreement dated __________ with the Executive Engineer, ${authority} (hereinafter called "the Employer") for execution of the work: ${nameOfWork}, for an accepted contract amount of Rs. ${estimatedCost.toLocaleString('en-IN')};

AND WHEREAS it is one of the conditions of the said Agreement that the Contractor shall deposit with the Employer a sum equivalent to ${securityDepositPercent}% of the contract value, being Rs. ${securityAmount.toLocaleString('en-IN')} (Rupees _________________________________ only) as Security Deposit / Performance Security for due and faithful performance of the contract and observance of all terms, conditions, stipulations and covenants therein contained;

AND WHEREAS the Contractor has requested us, _________________________________ (Name of Bank), a banking company within the meaning of the Banking Regulation Act, 1949, and having its branch office at _________________________________ (hereinafter called "the Bank"), to furnish the Performance Guarantee on its behalf;

NOW THIS GUARANTEE WITNESSETH and the Bank hereby unconditionally and irrevocably guarantees and agrees that in the event of the Contractor committing any breach of or default in complying with any of the terms and conditions of the said Agreement, the Bank shall on demand and without demur pay to the Employer such sum or sums not exceeding Rs. ${securityAmount.toLocaleString('en-IN')} (Rupees _________________________________ only) as the Employer may from time to time demand, without requiring the Employer to prove or show grounds or reasons for such demand.

This guarantee shall remain valid and in full force and effect from the date of execution of the Agreement until the expiry of _____ months (${validityMonths} months) from the scheduled date of completion of the work, or until the Performance Security is returned to the Contractor by the Employer after successful completion and final acceptance of the work including the defect liability period, whichever is later.

The Bank further agrees that:

1. The Employer shall be the sole judge for deciding whether the Contractor has committed any breach of or default in observing and performing any of the terms and conditions of the Agreement, and the decision of the Employer that the Contractor is in default thereunder shall be final and binding on the Bank.

2. The guarantee herein contained shall not be affected by any change in the constitution of the Contractor or the Bank or the Employer.

3. The Bank shall not be released from its liability under this guarantee by reason of any forbearance, indulgence, or extension of time given by the Employer to the Contractor.

4. This guarantee shall be a continuing guarantee and shall remain in force until all obligations of the Contractor under the Agreement are fully discharged and a certificate to that effect is issued by the Employer.

5. The Bank's liability under this guarantee shall not at any time exceed Rs. ${securityAmount.toLocaleString('en-IN')}.

6. Any notice or demand upon the Bank shall be in writing and shall be deemed to have been duly given if sent by registered post or delivered at the address mentioned herein.

7. This guarantee shall be governed by and construed in accordance with Indian Laws, and the Courts at __________ (location) shall have exclusive jurisdiction.

IN WITNESS WHEREOF the Bank, through its authorized official, has set and subscribed its hand on this _____ day of __________ 20___.

For and on behalf of the Bank:

Signature: _______________________
Name: ___________________________
Designation: _____________________
Bank Seal: _______________________
Branch: __________________________
Contact Details: __________________
Date: ____________________________

Witnesses:

1. Signature: _____________________
   Name: _________________________
   Address: _______________________
   
2. Signature: _____________________
   Name: _________________________
   Address: _______________________

---

8.3 BANK GUARANTEE FORMAT – GENERAL PROFORMA

To,
The Executive Engineer,
${authority}

REFERENCE: Tender / Contract No. __________
Work: ${nameOfWork}

We, _________________________________ (Name of Bank), having our registered office at _________________________________ and branch office at _________________________________, do hereby unconditionally and irrevocably guarantee the payment of any sum or sums up to a maximum aggregate sum of Rs. __________ (Rupees _________________________________ only) on behalf of _________________________________ (Name of Contractor), having its registered office at _________________________________.

We, the said Bank, do hereby undertake to pay immediately on first written demand by the Executive Engineer, ${authority}, without any demur, reservation, recourse, contest or protest, and without requiring the Executive Engineer to prove or show grounds for such demand, any sum or sums within the above-mentioned limit.

This guarantee shall be valid and shall remain in full force and effect from __________ to __________ (dates).

Any demand for payment under this guarantee shall be made in writing and delivered to the undersigned at the address mentioned below on or before the expiry date of this guarantee.

This guarantee shall not be discharged or affected by any change in the constitution of the Contractor or the Bank.

Notwithstanding anything contained herein, the liability of the Bank under this guarantee is restricted to Rs. __________ (Rupees _________________________________ only) and shall remain in force until __________.

This guarantee shall be governed by the Laws of India and the Courts at __________ shall have exclusive jurisdiction.

Dated this _____ day of __________ 20___.

For _________________________________ (Bank Name)

Signature: _______________________
Name: ___________________________
Designation: _____________________
Official Seal: ____________________
Branch: __________________________
Address: _________________________
Contact: _________________________
Date: ____________________________

---

8.4 INDEMNITY BOND

KNOW ALL MEN BY THESE PRESENTS

This Indemnity Bond is executed on this _____ day of __________ 20___ at __________.

BY

_________________________________ (Name of Contractor), a _________________________________ (Proprietorship / Partnership / Company), having its registered office at _________________________________ (hereinafter called "the Indemnifier" which expression shall unless repugnant to the context or meaning thereof include its successors and permitted assigns) of the ONE PART;

IN FAVOUR OF

The Executive Engineer, ${authority} (hereinafter called "the Employer" which expression shall include its successors and assigns) of the OTHER PART.

WHEREAS the Indemnifier has been awarded the work of ${nameOfWork} under Agreement No. __________ dated __________ for a contract value of Rs. ${estimatedCost.toLocaleString('en-IN')};

AND WHEREAS in connection with the execution of the said work, the Indemnifier is required to execute this Indemnity Bond in favour of the Employer;

NOW THIS BOND WITNESSETH AS FOLLOWS:

1. The Indemnifier hereby agrees to indemnify, defend, and hold harmless the Employer, its officers, employees, agents, and representatives from and against any and all claims, demands, actions, suits, proceedings, losses, damages, costs, charges, and expenses whatsoever which the Employer may sustain or incur by reason of:

   (a) Any breach or non-performance of the contract by the Indemnifier;
   (b) Any act, omission, negligence, or default on the part of the Indemnifier, its employees, agents, or sub-contractors;
   (c) Any damage to property or injury to persons arising out of or in connection with the execution of the work;
   (d) Any claims by third parties arising from the Indemnifier's operations;
   (e) Any violation of applicable laws, rules, regulations, or orders by the Indemnifier;
   (f) Any defect in workmanship or materials supplied by the Indemnifier.

2. The Indemnifier shall, at its own cost and expense, defend all suits, claims, or proceedings that may be brought against the Employer arising from any of the matters set out in Clause 1 above.

3. This indemnity shall be a continuing obligation and shall remain in full force and effect until all obligations of the Indemnifier under the contract are fully discharged.

4. The Indemnifier shall not be released from its obligations under this Bond by reason of any extension of time granted or any forbearance or indulgence shown to the Indemnifier by the Employer.

5. The decision of the Employer as to whether any event giving rise to a claim under this indemnity has occurred shall be final and binding on the Indemnifier.

6. This Indemnity Bond shall be governed by the Laws of India and the Courts at __________ shall have exclusive jurisdiction.

IN WITNESS WHEREOF the Indemnifier has set and subscribed its hand the day and year first hereinabove written.

For and on behalf of the Indemnifier:

Signature: _______________________
Name: ___________________________
Designation: _____________________
Official Seal: ____________________
Date: ____________________________

Witnesses:

1. Signature: _____________________
   Name: _________________________
   Address: _______________________
   Occupation: ____________________
   
2. Signature: _____________________
   Name: _________________________
   Address: _______________________
   Occupation: ____________________

---

8.5 SURETY BOND

KNOW ALL MEN BY THESE PRESENTS

This Surety Bond is executed on this _____ day of __________ 20___ at __________.

BY

1. _________________________________ (Name of Contractor) having its office at _________________________________ (hereinafter called "the Principal")

AND

2. _________________________________ (Name of Surety) having its office at _________________________________ (hereinafter called "the Surety")

(The Principal and the Surety are hereinafter collectively referred to as "the Obligors")

IN FAVOUR OF

The Executive Engineer, ${authority} (hereinafter called "the Obligee").

WHEREAS the Principal has entered into an Agreement dated __________ with the Obligee for execution of the work: ${nameOfWork}, for a contract sum of Rs. ${estimatedCost.toLocaleString('en-IN')};

AND WHEREAS the Obligee requires the Principal to furnish a Surety Bond as security for faithful performance of the contract;

NOW THEREFORE, the Principal and the Surety hereby jointly and severally bind themselves, their heirs, executors, administrators, successors, and assigns unto the Obligee in the penal sum of Rs. __________ (Rupees _________________________________ only) for the payment of which the Obligors bind themselves firmly by these presents.

THE CONDITION OF THIS OBLIGATION IS SUCH THAT:

IF the Principal shall faithfully perform and fulfill all the undertakings, covenants, terms, conditions, and agreements of the said Contract during the original term thereof and any extensions that may be granted by the Obligee, with or without notice to the Surety, and during the defect liability period, and shall indemnify and save harmless the Obligee from all costs and damages which the Obligee may suffer by reason of the Principal's default or failure, and shall reimburse and repay the Obligee all outlay and expense which the Obligee may incur in making good any such default, then this obligation shall be void; otherwise it shall remain in full force and effect.

The Surety hereby agrees that:

1. This Bond shall be deemed to be modified automatically so as to conform to any amendments or modifications in the Contract, provided such amendments or modifications do not substantially increase the Surety's obligations.

2. No change, extension of time, alteration, or addition to the terms of the Contract or to the work to be performed thereunder shall in any way affect the obligations of the Surety under this Bond, and the Surety hereby waives notice of any such change, extension, alteration, or addition.

3. In the event of default by the Principal, the Surety shall, at the option of the Obligee, either:
   (a) Complete the contract in accordance with its terms and conditions; or
   (b) Pay to the Obligee the penal sum mentioned in this Bond.

4. The Obligee shall have the right to proceed against the Surety without first proceeding against the Principal or exhausting any remedies against the Principal.

5. The decision of the Obligee as to the default of the Principal shall be final and binding on the Surety.

6. This Bond shall remain in force until all obligations of the Principal under the Contract are discharged and a certificate of satisfactory completion is issued by the Obligee.

7. This Bond shall be governed by the Laws of India and the Courts at __________ shall have exclusive jurisdiction.

IN WITNESS WHEREOF the Obligors have executed this Bond on the day and year first above written.

For and on behalf of the Principal:

Signature: _______________________
Name: ___________________________
Designation: _____________________
Seal: ____________________________
Date: ____________________________

For and on behalf of the Surety:

Signature: _______________________
Name: ___________________________
Designation: _____________________
Seal: ____________________________
Date: ____________________________

Witnesses:

1. Signature: _____________________
   Name: _________________________
   Address: _______________________
   
2. Signature: _____________________
   Name: _________________________
   Address: _______________________

---

8.6 CONDITIONS GOVERNING VALIDITY OF BONDS

8.6.1 APPLICABILITY

All bonds, guarantees, and securities furnished by the Contractor under this contract shall be subject to the following conditions, which shall be deemed to be incorporated in each bond or guarantee unless expressly excluded.

8.6.2 VALIDITY PERIOD

The validity period of each bond or guarantee shall be as specified in the respective proforma. In no case shall the validity period be less than the period specified in the contract documents. The Contractor shall ensure that the bond or guarantee remains valid until all obligations under the contract are fully discharged.

8.6.3 EXTENSION OF VALIDITY

If the period of contract is extended or the defect liability period is extended, the Contractor shall ensure that the validity of the bond or guarantee is correspondingly extended. Failure to extend the validity shall entitle the Employer to invoke and encash the existing bond or guarantee.

8.6.4 FORM AND CONTENT

All bonds and guarantees shall be in the proforma prescribed in this chapter or in such other form as may be acceptable to the Employer. The bonds shall be executed on appropriate stamp paper as per applicable Stamp Act. Bank guarantees shall be issued by nationalized banks or scheduled commercial banks acceptable to the Employer.

8.6.5 UNCONDITIONAL NATURE

All bank guarantees shall be unconditional and irrevocable and shall be payable on first demand without requiring the Employer to prove or show grounds or reasons for the demand. The Bank shall not be entitled to withhold payment on any ground whatsoever.

8.6.6 AUTHORITY OF ISSUING BANK

Bank guarantees shall be issued by branches of banks having adequate financial standing and shall be countersigned by the controlling authority of the bank if the branch does not have adequate powers. The Employer reserves the right to verify the authenticity and authority of the bank guarantee.

8.6.7 DEFECTIVE BONDS

If any bond or guarantee submitted by the Contractor is found to be defective in form, content, or validity, the Contractor shall replace the same with a valid bond or guarantee within the time specified by the Employer. Failure to do so shall entitle the Employer to invoke the defective bond or terminate the contract or both.

---

8.7 FORFEITURE & ENCASHMENT CLAUSES

8.7.1 GROUNDS FOR FORFEITURE

The Employer shall be entitled to forfeit and encash the Earnest Money Deposit, Performance Security, or any other bond or guarantee furnished by the Contractor in any of the following events:

(a) If the Contractor withdraws or modifies its tender after opening but before acceptance;
(b) If the Contractor fails to execute the agreement within the stipulated time after acceptance of tender;
(c) If the Contractor fails to furnish the required Performance Security within the stipulated time;
(d) If the Contractor commits any breach of the terms and conditions of the contract;
(e) If the Contractor fails to complete the work within the stipulated time and the extensions granted;
(f) If the Contractor abandons the work or shows persistent negligence;
(g) If the Contractor becomes insolvent or goes into liquidation;
(h) If the Contractor assigns or sub-lets the contract without written permission;
(i) If the Contractor is found guilty of corrupt or fraudulent practices;
(j) If the contract is terminated for default of the Contractor;
(k) Any other breach or default as specified in the contract documents.

8.7.2 PROCEDURE FOR ENCASHMENT

The decision of the Executive Engineer or any higher authority as to whether any event justifying forfeiture has occurred shall be final and binding on the Contractor and the Bank or Surety. Upon occurrence of any event specified in Clause 8.7.1, the Employer shall be entitled to encash the bond or guarantee by issuing a written demand to the Bank or Surety without requiring to give reasons or prove the grounds for such demand.

8.7.3 APPROPRIATION OF FORFEITED AMOUNT

Any amount forfeited or encashed shall be appropriated by the Employer towards any loss, damage, cost, or expense suffered or incurred by the Employer by reason of the Contractor's breach or default. The forfeiture shall not prejudice any other right or remedy available to the Employer under the contract or under law.

8.7.4 REFUND OF SECURITY

The Performance Security shall be refunded to the Contractor after satisfactory completion of the work and expiry of the defect liability period, subject to no claims being pending against the Contractor. The Employer shall not be liable to pay any interest on the security deposit or on the amount of bank guarantee.

8.7.5 NO WAIVER

The failure or delay by the Employer to exercise any right of forfeiture or encashment shall not constitute a waiver of such right and shall not prevent the Employer from exercising such right at any subsequent time.

---

8.8 EXTENSION OF VALIDITY CLAUSES

8.8.1 OBLIGATION TO EXTEND

Where the period of contract is extended or where the defect liability period is extended or where for any reason the obligations of the Contractor under the contract remain to be discharged beyond the original validity period of any bond or guarantee, the Contractor shall, at least one month before the expiry of such bond or guarantee, arrange to extend the validity of the bond or guarantee for such further period as may be required to cover the extended obligations.

8.8.2 PROCEDURE FOR EXTENSION

The Contractor shall obtain from the issuing Bank or Surety a written confirmation of extension of validity and shall submit the same to the Employer. The extension shall be unconditional and shall be on the same terms and conditions as the original bond or guarantee.

8.8.3 FAILURE TO EXTEND

If the Contractor fails to arrange extension of validity as required under Clause 8.8.1, the Employer shall be entitled to:

(a) Invoke and encash the existing bond or guarantee before its expiry;
(b) Terminate the contract and forfeit the security; and/or
(c) Recover any loss or damage from any amount due or that may become due to the Contractor or from the proceeds of the encashed bond or guarantee.

8.8.4 REPLACEMENT OF BONDS

Where a bank or surety is unable or unwilling to extend the validity of a bond or guarantee, the Contractor shall, at least one month before the expiry, arrange to replace the existing bond or guarantee with a fresh bond or guarantee from another acceptable bank or surety, having the same or increased amount and validity period as required.

8.8.5 COST OF EXTENSION

All costs, charges, and expenses relating to the extension of validity or replacement of bonds and guarantees shall be borne by the Contractor, and no extra payment whatsoever shall be made by the Employer on this account.

---

8.9 APPLICABLE AUTHORITY & JURISDICTION

8.9.1 COMPETENT AUTHORITY

For the purposes of invocation, encashment, and all matters relating to the bonds and guarantees under this chapter, the Executive Engineer, ${authority}, or such other authority as may be designated by the Government, shall be the competent authority. The decision of the competent authority on all matters relating to bonds and guarantees shall be final and binding on the Contractor and the Bank or Surety.

8.9.2 FINALITY OF DECISION

The Contractor and the Bank or Surety hereby agree that the decision of the competent authority as to:

(a) Whether any breach or default has occurred;
(b) Whether the bond or guarantee is liable to be invoked;
(c) The quantum of amount to be claimed;
(d) Any other matter relating to the bond or guarantee;

shall be final, conclusive, and binding and shall not be questioned in any court of law or before any other authority.

8.9.3 LEGAL JURISDICTION

All disputes, claims, or matters arising out of or relating to the bonds and guarantees furnished under this contract shall be subject to the exclusive jurisdiction of the Courts at __________ (location of the Employer's office), and the Contractor and the Bank or Surety hereby submit to such jurisdiction.

8.9.4 APPLICABLE LAW

All bonds, guarantees, indemnities, and sureties under this contract shall be governed by and construed in accordance with the Laws of India for the time being in force. In case of any conflict between the terms of the bond or guarantee and the contract, the terms of the contract shall prevail.

8.9.5 NOTICES AND COMMUNICATIONS

All notices, demands, and communications relating to bonds and guarantees shall be in writing and shall be deemed to have been duly given if delivered personally or sent by registered post acknowledgment due to the addresses mentioned in the bond or guarantee or to such other address as may be notified in writing.

---

8.10 REFERENCE TO DEPARTMENTAL CIRCULARS

8.10.1 GENERAL

The forms of bonds, guarantees, and securities prescribed in this chapter are based on standard proformas and practices as per applicable rules and departmental circulars. The Contractor shall familiarize himself with all relevant circulars, notifications, and instructions issued by the Government or the Department from time to time.

8.10.2 CIRCULARS AND AMENDMENTS

Any amendments, modifications, or substitutions to the proformas of bonds and guarantees as may be notified by the Government or the Department through circulars or notifications shall be deemed to be incorporated in this chapter and shall be binding on the Contractor.

8.10.3 COMPLIANCE

The Contractor shall comply with all instructions contained in departmental circulars relating to bonds, guarantees, and securities. Non-compliance with such instructions shall entitle the Employer to reject the bond or guarantee and take such action as may be deemed fit.

8.10.4 ADDITIONAL DOCUMENTS

The Employer reserves the right to call upon the Contractor to furnish such additional bonds, guarantees, indemnities, or securities as may be considered necessary in the interest of the work or as may be required under any circular or instruction issued by the competent authority.

8.10.5 USER UPLOADS

Note: Specific circulars, notifications, or amendments applicable to this tender may be uploaded by the user as additional annexures to this chapter.

Status: PENDING USER UPLOADS (Optional)

END OF CHAPTER 08`;
}

/**
 * Generate Chapter 09: Drawings (USER_UPLOAD)
 */
function generateChapter09(_inputForm: TenderInputForm): string {
  return `CHAPTER 09: DRAWINGS

TECHNICAL DRAWINGS AND SPECIFICATIONS

Status: PENDING USER UPLOAD

Instructions:
- Upload all relevant technical drawings
- Include site plans, layout drawings, cross-sections
- Ensure drawings are to scale and properly annotated
- All drawings must be signed by authorized technical personnel

Required Drawings:
1. General Arrangement Drawings
2. Site Layout Plan
3. Structural Drawings (if applicable)
4. Cross-sections and Elevations
5. Detailed Construction Drawings
6. Service Drawings (electrical, plumbing, etc.)

Note: This chapter will be populated once drawings are uploaded.`;
}

/**
 * Main chapter generator
 * Routes to appropriate generation strategy based on chapter ID
 */
export async function generateChapter(
  chapterId: ChapterId,
  inputForm: TenderInputForm
): Promise<ChapterGenerationResult> {
  const metadata = getChapterMetadata(chapterId);
  
  try {
    switch (chapterId) {
      case '01':
        return {
          success: true,
          content: generateChapter01(inputForm),
        };
      
      case '02':
        return await generateChapter02(inputForm);
      
      case '03':
        return {
          success: true,
          content: generateChapter03(inputForm),
        };
      
      case '04':
        return await generateChapter04(inputForm);
      
      case '05':
        return await generateChapter05(inputForm);
      
      case '06':
        return {
          success: true,
          content: generateChapter06(inputForm),
        };
      
      case '07':
        return await generateChapter07(inputForm);
      
      case '08':
        return {
          success: true,
          content: generateChapter08(inputForm),
        };
      
      case '09':
        return {
          success: true,
          content: generateChapter09(inputForm),
        };
      
      default:
        return {
          success: false,
          error: `Unknown chapter ID: ${chapterId}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during generation',
    };
  }
}
