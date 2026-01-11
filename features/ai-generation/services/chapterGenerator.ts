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
 */
async function generateChapter02(inputForm: TenderInputForm): Promise<ChapterGenerationResult> {
  const { nameOfWork, authority, location, estimatedCost, timeForCompletion, contractorClass, securityDepositPercent } = inputForm;
  
  const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}

You are generating Chapter 02: Detailed Tender Notice for an Indian government infrastructure tender.

CONSTRAINTS:
- Expand on the preliminary notice with comprehensive details
- Include technical and financial eligibility criteria
- Follow standard PWD tender format
- Be specific but avoid inventing exact regulatory numbers
- Use formal government language`;

  const userPrompt = `Generate a detailed tender notice for the following project:

Project: ${nameOfWork}
Authority: ${authority}
Location: ${location}
Estimated Cost: Rs. ${estimatedCost.toLocaleString('en-IN')}
Completion Time: ${timeForCompletion} months
Contractor Class Required: ${contractorClass}
Security Deposit: ${securityDepositPercent}% of contract value

The detailed notice must include:
1. Comprehensive project scope and objectives
2. Detailed eligibility requirements (technical capability, financial standing, past experience)
3. Submission process and documentation checklist
4. Evaluation criteria overview
5. Performance security requirements
6. Project timeline and key milestones
7. Site visit arrangements

Format this as Chapter 02 of an official tender document.`;

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
 */
async function generateChapter07(inputForm: TenderInputForm): Promise<ChapterGenerationResult> {
  const { nameOfWork, state } = inputForm;
  
  const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}

You are generating Chapter 07: Additional Specifications for an Indian infrastructure tender.

CRITICAL REQUIREMENTS:
- Reference IS codes (Indian Standards) where applicable
- Be aware of MoRTH specifications for road/highway projects
- Reference CPWD specifications for building works
- Include material specifications with measurable criteria
- Specify quality control and testing procedures
- All specifications must be verifiable`;

  const userPrompt = `Generate Additional Technical Specifications for:

Project: ${nameOfWork}
State: ${state}

Include:
1. Material specifications (with IS codes)
2. Construction methodology and workmanship standards
3. Quality control procedures and testing protocols
4. Equipment and machinery specifications
5. Environmental compliance requirements
6. Safety standards and site management
7. Measurement and payment procedures

Reference appropriate IS codes, MoRTH specifications, and CPWD standards.
Format as Chapter 07 with numbered sections.`;

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
