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
 * Generate Chapter 08: Proforma of Bonds (TEMPLATE_FILL)
 */
function generateChapter08(inputForm: TenderInputForm): string {
  const { authority, estimatedCost, securityDepositPercent } = inputForm;
  
  const securityAmount = Math.round(estimatedCost * (securityDepositPercent / 100));
  
  return `CHAPTER 08: PROFORMA OF BONDS & CIRCULARS

8.1 PERFORMANCE SECURITY BOND

BANK GUARANTEE FOR PERFORMANCE SECURITY

To: ${authority}

WHEREAS _________________________ (hereinafter called "the Contractor") has undertaken, in pursuance of Contract No. _____________ dated ________ to execute the work _________________________.

AND WHEREAS it has been stipulated in the said contract that the Contractor shall furnish you with a Bank Guarantee for Rs. ${securityAmount.toLocaleString('en-IN')} (${securityDepositPercent}% of contract value) as security for compliance with the Contractor's obligations in accordance with the Contract;

NOW THEREFORE we, _________________________ Bank (hereinafter referred to as "the Bank") at the request of the Contractor do hereby undertake to pay to you an amount not exceeding Rs. ${securityAmount.toLocaleString('en-IN')} against any loss or damage caused to or suffered by you by reason of any breach by the said Contractor of any of the terms and conditions contained in the said Contract.

This guarantee shall remain valid until _____________ (completion date + defect liability period).

Valid from: ________________
Valid until: ________________

Signature of Authorized Bank Official: _______________________
Name: __________________________
Designation: ____________________
Bank Seal: ______________________

---

8.2 EARNEST MONEY DEPOSIT BOND

Similar format as above, for EMD purposes.

---

8.3 RELEVANT CIRCULARS

Note: User may upload additional circulars, notifications, or amendments relevant to this tender.

Status: PENDING USER UPLOADS (Optional)`;
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
