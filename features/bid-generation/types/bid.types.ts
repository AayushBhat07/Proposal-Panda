/** Indian two-bid system: Cover I (technical / eligibility) and Cover II (financial / price). */
export type BidCover = 'technical' | 'financial';

export interface BidSection {
  id: string;
  title: string;
  cover: BidCover;
  /** 'model' = drafted by the local LLM, 'template' = standard CPWD-style proforma with placeholders */
  source: 'model' | 'template';
  content: string;
}

/** First-draft ("foundation") bid built from an analysed tender. */
export interface FoundationBid {
  tenderId: string;
  tenderTitle: string;
  generatedAt: string;
  modelUsed: string;
  sections: BidSection[];
}
