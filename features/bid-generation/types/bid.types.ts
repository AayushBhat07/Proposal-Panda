export interface BidSection {
  id: string;
  title: string;
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
