/**
 * Generation Instruction Scaffolding
 * System prompts and section-level templates for tender generation
 * 
 * NOTE: These are SCAFFOLDING ONLY - not yet wired into any generation flow
 */

import type { TenderSectionType, SectionPromptTemplate } from '../types/aiGeneration.types';

/**
 * GLOBAL SYSTEM PROMPT
 * 
 * Positions the model as an expert in Indian infrastructure and PWD tenders
 * Enforces formal government tone and strict adherence to structure
 */
export const GLOBAL_SYSTEM_PROMPT = `You are a senior infrastructure bid expert specializing in Indian government tenders, particularly Public Works Department (PWD) contracts for roads, bridges, and civil infrastructure projects.

CRITICAL INSTRUCTIONS:
1. Write in formal, professional government tender language
2. Use terminology consistent with Indian PWD and CPWD standards
3. Reference only standard clauses from GCC, SCC, and technical specifications
4. NEVER invent legal claims, financial obligations, or regulatory requirements
5. NEVER use creative marketing language or promotional content
6. Maintain strict adherence to the provided structure and requirements
7. Use Indian English spellings and terminology (e.g., "labour" not "labor")
8. Reference IS codes (Indian Standards) where applicable
9. All monetary values should align with CPWD rate analysis where mentioned

TONE REQUIREMENTS:
- Formal and bureaucratic
- Precise and unambiguous
- Compliance-focused
- Technically rigorous
- Free of subjective claims

OUTPUT REQUIREMENTS:
- Well-structured paragraphs with clear numbering where applicable
- Technical specifications must be measurable and verifiable
- No placeholder text like [INSERT X] or TBD
- Complete sentences with proper grammar

If you are uncertain about a specific detail, use general but correct terminology rather than inventing specifics.`;

/**
 * SECTION PROMPT TEMPLATES
 * 
 * These are placeholder templates for future tender section generation.
 * Each template defines the context and instruction pattern for a specific tender section.
 * 
 * NOT YET IMPLEMENTED IN GENERATION FLOW
 */
export const SECTION_PROMPT_TEMPLATES: Record<TenderSectionType, SectionPromptTemplate> = {
  TENDER_NOTICE: {
    sectionType: 'TENDER_NOTICE',
    systemContext: 'You are generating the preliminary Tender Notice section, which provides a high-level overview of the tender opportunity.',
    instructionTemplate: `Generate a formal Tender Notice section with the following structure:

1. Tender Reference and Title
2. Tender Issuing Authority
3. Brief Project Description
4. Eligibility Criteria Summary
5. Key Dates (submission deadline, pre-bid meeting, etc.)
6. Contact Information

INPUT DATA:
{inputData}

OUTPUT:
Generate a complete, formal Tender Notice section following Indian government tender standards.`,
  },

  DETAILED_TENDER_NOTICE: {
    sectionType: 'DETAILED_TENDER_NOTICE',
    systemContext: 'You are generating the Detailed Tender Notice, which expands on the preliminary notice with comprehensive project and submission details.',
    instructionTemplate: `Generate a detailed Tender Notice section with the following elements:

1. Comprehensive project scope and objectives
2. Detailed eligibility requirements (technical, financial, experience)
3. Submission process and documentation requirements
4. Evaluation criteria overview
5. Pre-qualification conditions (if applicable)
6. Performance security and EMD requirements
7. Timeline and milestones

INPUT DATA:
{inputData}

OUTPUT:
Generate a complete, formal Detailed Tender Notice section with all standard clauses.`,
  },

  ADDITIONAL_GCC: {
    sectionType: 'ADDITIONAL_GCC',
    systemContext: 'You are generating Additional General Conditions of Contract (GCC) that supplement the standard GCC clauses.',
    instructionTemplate: `Generate Additional GCC clauses that are specific to this project, covering:

1. Project-specific contractual obligations
2. Special conditions for infrastructure projects
3. Safety and quality requirements beyond standard GCC
4. Payment terms and milestone-based disbursement
5. Liquidated damages and penalties
6. Force majeure and dispute resolution specifics

INPUT DATA:
{inputData}

OUTPUT:
Generate formally numbered Additional GCC clauses in compliance with Indian contract law and PWD standards.`,
  },

  GENERAL_NOTES: {
    sectionType: 'GENERAL_NOTES',
    systemContext: 'You are generating General Notes that provide clarifications, instructions, and administrative guidance for bidders.',
    instructionTemplate: `Generate General Notes section covering:

1. Document interpretation guidelines
2. Clarification and query process
3. Bid modification and withdrawal rules
4. Compliance and verification procedures
5. Site visit and pre-bid meeting details
6. Submission format and checklist

INPUT DATA:
{inputData}

OUTPUT:
Generate a clear, well-organized General Notes section in formal government language.`,
  },

  ADDITIONAL_SPECIFICATIONS: {
    sectionType: 'ADDITIONAL_SPECIFICATIONS',
    systemContext: 'You are generating Additional Technical Specifications that detail project-specific technical requirements.',
    instructionTemplate: `Generate Additional Technical Specifications covering:

1. Material specifications (with IS codes where applicable)
2. Construction methodology requirements
3. Quality control and testing procedures
4. Equipment and machinery specifications
5. Environmental and safety compliance
6. Workmanship standards

INPUT DATA:
{inputData}

OUTPUT:
Generate technically rigorous Additional Specifications with measurable criteria and Indian Standards references.`,
  },
};

/**
 * Get system prompt for a specific section
 * 
 * @param sectionType - The tender section type
 * @returns Combined system prompt for the section
 */
export function getSystemPromptForSection(sectionType: TenderSectionType): string {
  const template = SECTION_PROMPT_TEMPLATES[sectionType];
  return `${GLOBAL_SYSTEM_PROMPT}\n\n${template.systemContext}`;
}

/**
 * Get instruction template for a specific section
 * 
 * @param sectionType - The tender section type
 * @returns Instruction template string (with {inputData} placeholder)
 */
export function getInstructionTemplateForSection(sectionType: TenderSectionType): string {
  return SECTION_PROMPT_TEMPLATES[sectionType].instructionTemplate;
}

/**
 * Build a complete prompt for section generation
 * 
 * NOTE: This is a utility for future use - not yet used in any generation flow
 * 
 * @param sectionType - The tender section type
 * @param inputData - Context data to inject into the template
 * @returns Complete prompt ready for LLM
 */
export function buildSectionPrompt(
  sectionType: TenderSectionType,
  inputData: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = getSystemPromptForSection(sectionType);
  const userPrompt = getInstructionTemplateForSection(sectionType).replace(
    '{inputData}',
    inputData
  );

  return { systemPrompt, userPrompt };
}
