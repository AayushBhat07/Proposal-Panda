/**
 * WORD-BASED TENDER GENERATION SCRIPT
 * 
 * PRIMARY OUTPUT: Microsoft Word (.docx)
 * AUTHORITATIVE FORMAT for Maharashtra PWD Tenders
 * 
 * This script generates a professionally formatted, commercially viable tender document.
 */

import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableCell, 
  TableRow,
  AlignmentType,
  HeadingLevel,
  WidthType,
  BorderStyle,
  VerticalAlign,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  PageBorders,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { generateChapter } from '../features/ai-generation/services/chapterGenerator';
import { CHAPTER_ORDER } from '../features/ai-generation/config/chapterConfig';
import type { TenderInputForm, ChapterId } from '../features/ai-generation/types/chapterGeneration.types';
import { checkLlmHealth } from '../features/ai-generation/services/localLlmService';

// ===========================
// REALISTIC DATA GENERATORS
// ===========================

const DISTRICTS_MAHARASHTRA = [
  'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 
  'Solapur', 'Kolhapur', 'Thane', 'Ahmednagar', 'Satara'
];

const PROJECT_TYPES = [
  {
    type: 'Road Construction',
    templates: [
      'Construction of 2-lane concrete road from {location} to {nearby}',
      'Widening and strengthening of existing road connecting {location} and {nearby}',
      'Construction of rural road and culverts in {location} Taluka',
    ],
    costRange: [80000000, 500000000],
    timeRange: [12, 24],
  },
  {
    type: 'Building Construction',
    templates: [
      'Construction of Government Hospital Building at {location}',
      'Construction of Administrative Office Complex in {location}',
      'Construction of Multi-storey Residential Building for Government Staff at {location}',
    ],
    costRange: [50000000, 300000000],
    timeRange: [18, 30],
  },
  {
    type: 'Water Works',
    templates: [
      'Construction of Water Supply Scheme for {location} Municipal Area',
      'Laying of water supply pipeline and distribution network in {location}',
      'Construction of overhead water tank and pumping station at {location}',
    ],
    costRange: [60000000, 250000000],
    timeRange: [12, 20],
  },
];

const CONTRACTOR_CLASSES = ['Class I-A', 'Class I-B', 'Class I', 'Special Class'];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRealisticTenderInput(): TenderInputForm {
  const district = getRandomElement(DISTRICTS_MAHARASHTRA);
  const nearby = getRandomElement(DISTRICTS_MAHARASHTRA.filter(d => d !== district));
  const projectType = getRandomElement(PROJECT_TYPES);
  const nameTemplate = getRandomElement(projectType.templates);
  const nameOfWork = nameTemplate.replace('{location}', district).replace('{nearby}', nearby);
  
  const estimatedCost = getRandomInRange(projectType.costRange[0], projectType.costRange[1]);
  const timeForCompletion = getRandomInRange(projectType.timeRange[0], projectType.timeRange[1]);
  
  const emdPercent = 0.01 + (Math.random() * 0.01);
  const emd = Math.round(estimatedCost * emdPercent);
  
  const securityDepositPercent = 5 + (Math.random() * 5);
  
  return {
    nameOfWork,
    authority: 'Maharashtra Public Works Department',
    location: `${district}, Maharashtra`,
    estimatedCost,
    timeForCompletion,
    contractType: 'Item Rate',
    emd,
    securityDepositPercent: Math.round(securityDepositPercent * 10) / 10,
    contractorClass: getRandomElement(CONTRACTOR_CLASSES),
    state: 'Maharashtra',
  };
}

// ===========================
// WORD DOCUMENT BUILDER
// ===========================

class TenderDocumentBuilder {
  private sections: any[] = [];
  private inputForm: TenderInputForm;

  constructor(inputForm: TenderInputForm) {
    this.inputForm = inputForm;
  }

  /**
   * Add chapter title (Heading 1, centered, bold, all caps)
   * Uses page break before for Apple Pages compatibility
   */
  private createChapterTitle(chapterNumber: string, chapterName: string, isFirst: boolean = false): Paragraph {
    return new Paragraph({
      text: `CHAPTER ${chapterNumber}: ${chapterName.toUpperCase()}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      pageBreakBefore: !isFirst, // Page break before each chapter except first
    });
  }

  /**
   * Create body paragraph (justified, Times New Roman, 11-12pt)
   */
  private createBodyParagraph(text: string, options: any = {}): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          font: 'Times New Roman',
          size: 24, // 12pt
          ...options,
        }),
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 360, before: 120, after: 120 }, // 1.5 line spacing
    });
  }

  /**
   * Create blank signature line
   */
  private createSignatureLine(label: string): Paragraph[] {
    return [
      new Paragraph({
        children: [new TextRun({ text: '', font: 'Times New Roman', size: 24 })],
        spacing: { before: 240 },
      }),
      new Paragraph({
        children: [new TextRun({ text: label, font: 'Times New Roman', size: 24 })],
        spacing: { after: 60 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Signature: _______________________', font: 'Times New Roman', size: 24 })],
        spacing: { after: 60 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Name: __________________________', font: 'Times New Roman', size: 24 })],
        spacing: { after: 60 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Designation: ____________________', font: 'Times New Roman', size: 24 })],
        spacing: { after: 60 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Date: ___________________________', font: 'Times New Roman', size: 24 })],
        spacing: { after: 120 },
      }),
    ];
  }

  /**
   * Parse chapter content into Word paragraphs
   */
  private parseContentToParagraphs(content: string): Paragraph[] {
    const lines = content.split('\n');
    const paragraphs: Paragraph[] = [];

    for (const line of lines) {
      if (line.trim() === '') {
        paragraphs.push(new Paragraph({ text: '' }));
        continue;
      }

      // Detect headings
      const isHeading = line.startsWith('CHAPTER') || 
                       line.match(/^[0-9]+\.\s+[A-Z\s]+$/) ||
                       (line === line.toUpperCase() && line.length < 60 && line.length > 5);

      if (isHeading) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.trim(),
                font: 'Times New Roman',
                size: 24,
                bold: true,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 240, after: 120 },
          })
        );
      } else {
        paragraphs.push(this.createBodyParagraph(line));
      }
    }

    return paragraphs;
  }

  /**
   * Create Schedule B - Bill of Quantities Table
   * Explicit widths for Apple Pages compatibility
   */
  private createScheduleBTable(): Table {
    const rows: TableRow[] = [];

    // Header row
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Sr. No', alignment: AlignmentType.CENTER, style: 'Strong' })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Item Description', alignment: AlignmentType.CENTER, style: 'Strong' })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Unit', alignment: AlignmentType.CENTER, style: 'Strong' })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Quantity', alignment: AlignmentType.CENTER, style: 'Strong' })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Rate (₹)', alignment: AlignmentType.CENTER, style: 'Strong' })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Amount (₹)', alignment: AlignmentType.CENTER, style: 'Strong' })],
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'D9D9D9' },
          }),
        ],
        tableHeader: true,
      })
    );

    // Sample BOQ items (40 rows) - Phase 3B: Realistic Maharashtra PWD BOQ
    const boqItems = [
      // PRELIMINARY & SITE PREPARATION WORKS
      { desc: 'Clearing and grubbing of site including removal of trees, bushes, shrubs, grass, roots and other vegetation, debris, rubbish and objectionable matter of any kind from the ground surface to a depth of at least 30 cm below the original ground level including removal of top soil for a depth of 15 cm and stacking the same for use in landscaping work as directed by Engineer-in-Charge, complete as per specifications', unit: 'Hec', qty: 2.5 },
      { desc: 'Dismantling of existing structures including paved surfaces, kerbs, drains, culverts, boundary walls or any other structures as directed, sorting out the material and stacking serviceable material separately at site, disposal of unserviceable material to approved dumping grounds including all leads, lifts and transportation charges, complete as directed by Engineer-in-Charge', unit: 'Cum', qty: 850.0 },
      { desc: 'Providing and erecting temporary site office, stores, and labour hutments including all electrical connections, water supply, sanitary arrangements, furniture and equipment, maintaining the same throughout construction period and removing at the end of contract period, complete as per specifications', unit: 'LS', qty: 1.0 },
      
      // EARTHWORK EXCAVATION
      { desc: 'Earthwork in excavation in ordinary soil to required width and depth including breaking clods, dressing the sides and bottom, bailing out water as necessary, stacking excavated material separately for backfill and disposal, including all leads up to 50 metres and lifts up to 1.5 metres as directed, complete as per specifications and drawings', unit: 'Cum', qty: 5200.0 },
      { desc: 'Earthwork in excavation in hard soil including breaking hard soil/murrum by means of picks and crowbars or by blasting as necessary, removing roots and other vegetation, bailing out water, dressing bottom and sides to required levels and slopes, including all leads up to 50 metres and lifts up to 1.5 metres, disposal of surplus excavated material as directed by Engineer-in-Charge, complete as per specifications', unit: 'Cum', qty: 3800.0 },
      { desc: 'Earthwork in excavation for foundation of structures by mechanical means including dewatering by pumping as necessary, trimming bottom and sides to required levels and slopes, backfilling excavated material around structures in layers not exceeding 150 mm after proper compaction with watering as required, including all leads, lifts and disposal of surplus material, complete as directed by Engineer-in-Charge', unit: 'Cum', qty: 2650.0 },
      
      // FOUNDATION & SUBSTRUCTURE
      { desc: 'Providing and laying plain cement concrete mix 1:4:8 (1 cement : 4 coarse sand : 8 graded stone aggregate 40mm nominal size) in foundation including levelling and compacting the bed, curing the concrete for not less than 10 days, including cost of form work, centering and shuttering where necessary, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Cum', qty: 520.0 },
      { desc: 'Providing and laying reinforced cement concrete M25 grade using cement, coarse sand confirming to zone II, graded stone aggregate 20mm nominal size, including hoisting and placing in position with mechanical vibrator, excluding cost of centering, shuttering and reinforcement, curing the concrete for not less than 14 days, complete as per relevant IS specifications and as directed by Engineer-in-Charge', unit: 'Cum', qty: 1850.0 },
      { desc: 'Providing TMT steel reinforcement for RCC work of grade Fe 500 or Fe 500D including cutting, bending, binding with binding wire of not less than 26 gauge, placing in position, fixing to required levels and maintaining proper cover as per approved bar bending schedule, including all labour, scaffolding, tools and plants, wastage and overlap, complete as per IS 2502 and as directed by Engineer-in-Charge', unit: 'MT', qty: 165.5 },
      
      // CONCRETE WORKS (PCC / RCC)
      { desc: 'Providing and laying plain cement concrete mix M15 grade in basement, plinth and at ground level including leveling and compacting by mechanical vibrator, curing for not less than 10 days, including cost of form work, centering and shuttering wherever required, complete as per IS 456 and as directed by Engineer-in-Charge', unit: 'Cum', qty: 380.0 },
      { desc: 'Providing and laying reinforced cement concrete M30 grade in superstructure including columns, beams, slabs, chajjas, lintels etc., using ordinary portland cement, clean washed coarse sand of zone II, graded hard broken granite stone aggregate 20mm nominal size, including hoisting, placing in position by mechanical means, compaction by mechanical vibrator, excluding cost of centering, shuttering and reinforcement, curing the concrete for not less than 14 days, complete as per IS 456 and as directed by Engineer-in-Charge', unit: 'Cum', qty: 1250.0 },
      { desc: 'Providing and fixing form work including centering, shuttering and strutting for RCC work, including stripping the form work after specified curing period, for foundations, footings and mass concrete blocks; form work shall be of approved quality, properly braced and supported to maintain correct shape and position during concrete placement, including cost of form oil, all labour, scaffolding and transportation, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 3200.0 },
      { desc: 'Providing and fixing form work including centering, shuttering and strutting for RCC work in suspended slabs, beams, cantilevers, balconies, chajjas, landings, shelves at any height including stripping after specified curing period; form work shall be of marine ply or steel shuttering properly braced to maintain shape, including cost of props, brackets, form oil and all labour, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 2850.0 },
      
      // MASONRY & RETAINING STRUCTURES
      { desc: 'Brick masonry in cement mortar 1:6 (1 cement : 6 coarse sand) using first class well burnt bricks of approved quality having crushing strength of not less than 75 Kg per sq cm including raking out joints, cleaning and curing for not less than 10 days including cost of all materials, labour, scaffolding, tools and plants, including all leads and lifts, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Cum', qty: 650.0 },
      { desc: 'Providing random rubble stone masonry in cement mortar 1:6 (1 cement : 6 coarse sand) using approved quality hard granite stone, well dressed and squared, including raking out joints, scaffolding and curing for not less than 10 days, including cost of all materials, labour, equipment and transportation, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Cum', qty: 485.0 },
      { desc: 'Cement plaster 12mm thick in single coat to walls on brick/RCC surface using cement mortar 1:4 (1 cement : 4 coarse sand), including raking out joints, roughening the surface, cleaning and curing for not less than 7 days, finishing with a trowel to give an even shade, including cost of scaffolding, curing and all labour, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 2450.0 },
      { desc: 'Cement plaster 20mm thick in two coats to walls on brick/stone surface using cement mortar 1:5 (1 cement : 5 coarse sand), first undercoat of 12mm and finishing coat of 8mm thickness, including raking out joints, roughening surface, cleaning and curing for not less than 7 days, finishing with a trowel to give an even shade, including cost of scaffolding and all labour, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 1680.0 },
      
      // DRAINAGE & STORM WATER WORKS
      { desc: 'Providing and laying stoneware pipes 150mm internal diameter class NP2 conforming to IS 651 in trenches including jointing with cement mortar 1:1 (1 cement : 1 coarse sand), testing of joints and cement concrete bedding 150mm thick M15 grade below and on sides up to top of pipe, curing the concrete for not less than 7 days, including all labour, materials and transportation charges, complete as per specifications and as directed by Engineer-in-Charge', unit: 'RM', qty: 580.0 },
      { desc: 'Providing and laying HDPE pipes 110mm nominal bore conforming to IS 4984 in trenches including jointing with couplers and rubber gasket joints, testing of joints for leakage, bedding with sand cushion 100mm thick below and on sides, backfilling the trench in layers with proper compaction, including all leads, lifts and labour, complete as per specifications and as directed by Engineer-in-Charge', unit: 'RM', qty: 950.0 },
      { desc: 'Construction of RCC side drain 300mm x 300mm internal size including earthwork excavation, PCC M15 grade 100mm thick at bottom, RCC M25 grade walls 100mm thick with cover slab, reinforcement as per design, plastering inside surface 12mm thick cement mortar 1:3, curing for not less than 10 days, finishing and disposal of surplus material, including all leads, lifts and labour, complete as per drawings and as directed by Engineer-in-Charge', unit: 'RM', qty: 1680.0 },
      { desc: 'Providing and constructing catch pit 600mm x 600mm x 600mm internal size in brick masonry cement mortar 1:4 with cement plaster 12mm thick inside, PCC M15 bottom 100mm thick, RCC M25 top slab 75mm thick with cast iron grating and frame 450mm x 450mm conforming to IS 1726, including earthwork excavation and disposal, curing, all labour and material, complete as per drawing and as directed by Engineer-in-Charge', unit: 'No', qty: 32 },
      { desc: 'Providing and constructing manhole 900mm internal diameter and depth as per site requirement in brick masonry cement mortar 1:4 with cement plaster 12mm thick inside, PCC M15 bottom 100mm thick, RCC M25 top slab 100mm thick, cast iron manhole cover and frame 600mm diameter conforming to IS 1726 class C 50 kN load, including earthwork excavation, concrete channel, footstep irons, dewatering, curing and all labour, complete as per standard drawing and as directed by Engineer-in-Charge', unit: 'No', qty: 18 },
      
      // PAVEMENT & ROAD WORKS
      { desc: 'Preparation of sub-grade by scarifying the existing surface to a depth of 150mm, watering and rolling with smooth wheeled roller 8-10 tonnes in stages to achieve the desired density as per relevant IRC specifications, complete as directed by Engineer-in-Charge', unit: 'Sqm', qty: 15200.0 },
      { desc: 'Providing and laying granular sub-base (GSB) of approved quality with proper mix of sand, soil and gravel in layers not exceeding 100mm compacted thickness, including spreading, watering and compacting to achieve dry density of not less than 98% of maximum dry density determined by modified proctor test, complete as per IRC 15 and MORT&H specifications and as directed by Engineer-in-Charge', unit: 'Cum', qty: 3250.0 },
      { desc: 'Providing and laying wet mix macadam (WMM) Grade II with aggregate of graded stone and crusher dust using approved screening with effective size of 53mm to 22.4mm, spreading in uniform layers with mechanical spreader in layers not exceeding 75mm compacted thickness, watering, mixing and compacting with vibratory power roller 8-10 tonnes to achieve minimum dry density of 98% of maximum dry density determined by modified proctor test, complete as per IRC 15 and MORT&H specifications and as directed by Engineer-in-Charge', unit: 'Cum', qty: 2680.0 },
      { desc: 'Providing and applying tack coat with bitumen emulsion SS1 grade conforming to IS 8887 at the rate of 0.25 kg per sqm on the prepared surface including cleaning of surface, heating and spraying the emulsion uniformly with mechanical sprayer, complete as per IRC specifications and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 12500.0 },
      { desc: 'Providing and laying dense bituminous macadam (DBM) with graded stone aggregate and bitumen VG30 using hot mix plant at controlled temperature of 165-180 degree Celsius, transporting to site, spreading in uniform layers of 50mm compacted thickness with mechanical paver finisher, compacting with vibratory tandem roller 8-10 tonnes to achieve required density, complete as per IRC 111 and MORT&H specifications and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 12500.0 },
      { desc: 'Providing and laying bituminous concrete (BC) with graded stone aggregate and bitumen VG30 using hot mix plant at controlled temperature of 165-180 degree Celsius, transporting to site, spreading in uniform layers of 25mm compacted thickness with mechanical paver finisher having electronic sensor control, compacting with vibratory tandem roller 8-10 tonnes to achieve required density and smooth surface, complete as per IRC 111 and MORT&H specifications and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 12500.0 },
      { desc: 'Providing and laying cement concrete pavement M30 grade including subgrade preparation, spreading PCC M15 lean concrete 75mm thick, laying reinforcement mesh as per approved design, placing concrete in alternate bays with slipform paver or fixed form method, providing contraction and expansion joints at specified spacing with joint filler board and sealant, finishing surface with mechanical finisher, texturing, curing for not less than 14 days with wet gunny bags, complete as per IRC 58 and as directed by Engineer-in-Charge', unit: 'Cum', qty: 4250.0 },
      
      // ANCILLARY & FINISHING WORKS
      { desc: 'Providing and fixing precast cement concrete kerb stone 150mm x 300mm size with cement mortar 1:3 (1 cement : 3 coarse sand) over PCC M15 grade 100mm thick bed, including jointing with cement mortar, finishing top surface with carborundum stone, curing for not less than 7 days, including all materials, labour, transportation and fixing charges, complete as per drawing and as directed by Engineer-in-Charge', unit: 'RM', qty: 2580.0 },
      { desc: 'Providing and laying cement concrete footpath M20 grade 75mm thick over PCC M15 grade 75mm thick bed including preparation of base, laying concrete, finishing top surface with carborundum stone to give non-slip texture, providing joints at 1 metre interval, curing for not less than 7 days, including all materials, labour and equipment, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 1350.0 },
      { desc: 'Providing and fixing mild steel railing consisting of MS tubular posts 50mm NB and horizontal rails 25mm NB at spacing as per approved design including welding, cleaning, applying two coats of red oxide primer and two coats of synthetic enamel paint of approved shade, embedded in cement concrete 1:2:4 mix, including all materials, labour, scaffolding and transportation, complete as per drawing and as directed by Engineer-in-Charge', unit: 'RM', qty: 480.0 },
      { desc: 'Providing and fixing road traffic signage as per IRC 67 of approved design and size using reflectorised material grade III with aluminium sheet backing 3mm thick fixed on MS tubular post 50mm NB and 3mm thick embedded in cement concrete 1:2:4 mix 600mm x 600mm x 600mm size foundation, including painting of post, supplying, fabricating and fixing in position, complete as directed by Engineer-in-Charge', unit: 'No', qty: 28 },
      { desc: 'Providing and fixing road marking with thermoplastic compound 2.5mm thick with reflectorising glass beads at 250 gsm including preparation of road surface by sweeping, heating and applying primer, laying molten thermoplastic with hand applicator or road marking equipment, complete as per IRC 35 and as directed by Engineer-in-Charge', unit: 'Sqm', qty: 580.0 },
      
      // ELECTRICAL & STREET LIGHTING
      { desc: 'Providing and erecting street light pole consisting of MS tubular pole 6 metres height 120mm base diameter and 85mm top diameter 4mm thick with required foundation in cement concrete M20 grade including earthwork excavation, anchor bolt assembly, erecting pole and plumbing, painting with two coats of zinc chromate primer and two coats of synthetic enamel paint, complete as per specifications and as directed by Engineer-in-Charge', unit: 'No', qty: 55 },
      { desc: 'Providing and fixing LED street light fixture 60 watts high pressure die cast aluminium housing IP65 rating with optical reflector, surge protection device, electronic driver of approved make and efficiency not less than 90 lumens per watt, including bracket arm assembly, fixing on pole with nuts and bolts, wiring and testing, complete as per specifications and as directed by Engineer-in-Charge', unit: 'No', qty: 55 },
      { desc: 'Providing and laying underground armoured PVC insulated aluminium conductor cable 4 core 35 sq mm for street lighting in trench 500mm deep including excavation, laying cable on sand bed 75mm thick, covering with sand 75mm on top, laying cover tiles, backfilling and compacting, identification tags at intervals, connection at both ends, complete as per IS 1554 and as directed by Engineer-in-Charge', unit: 'RM', qty: 1150.0 },
      { desc: 'Providing and fixing distribution board 8 way TPN suitable for miniature circuit breakers with neutral link, earth bar, busbar, interconnections, din rail, enclosure of sheet steel IP55 rating wall mounting type, including drilling holes, supplying and fixing rawl plugs, screws, wiring, testing and commissioning, complete as per IE rules and as directed by Engineer-in-Charge', unit: 'No', qty: 4 },
      
      // MISCELLANEOUS WORKS
      { desc: 'Earth filling in layers not exceeding 200mm in thickness including breaking clods, watering, spreading and consolidating to required density by mechanical means as per relevant IS codes, including all leads, lifts and labour charges, complete as per specifications and as directed by Engineer-in-Charge', unit: 'Cum', qty: 3850.0 },
      { desc: 'Providing and spreading good quality approved morum in layers not exceeding 100mm compacted thickness, including breaking clods, watering and rolling with smooth wheeled roller 8 tonnes in stages to achieve desired compaction, including all leads and lifts, complete as directed by Engineer-in-Charge', unit: 'Cum', qty: 2200.0 },
      { desc: 'Dewatering work by pumping out water from foundation trenches and other excavations including providing pumps of adequate capacity, hose pipes, electrical connections, labour for continuous operation, disposal of pumped water away from site, maintaining dry working condition till backfilling is completed, complete as directed by Engineer-in-Charge', unit: 'LS', qty: 1.0 },
      { desc: 'Final cleaning of work including removal of all construction debris, centering shuttering materials, surplus materials, unused earth and stone, cleaning all surfaces, removal of all objectionable matter from site and disposal at approved dumping grounds, handing over the entire work in clean condition, complete as directed by Engineer-in-Charge', unit: 'LS', qty: 1.0 },
    ];

    for (let i = 0; i < boqItems.length; i++) {
      const item = boqItems[i];
      const rate = getRandomInRange(500, 50000);
      const amount = rate * item.qty;

      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: (i + 1).toString(), alignment: AlignmentType.CENTER })],
              verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              children: [new Paragraph({ text: item.desc })],
              verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              children: [new Paragraph({ text: item.unit, alignment: AlignmentType.CENTER })],
              verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              children: [new Paragraph({ text: item.qty.toFixed(2), alignment: AlignmentType.RIGHT })],
              verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              children: [new Paragraph({ text: rate.toLocaleString('en-IN'), alignment: AlignmentType.RIGHT })],
              verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              children: [new Paragraph({ text: amount.toLocaleString('en-IN'), alignment: AlignmentType.RIGHT })],
              verticalAlign: VerticalAlign.CENTER,
            }),
          ],
        })
      );
    }

    return new Table({
      rows,
      width: { size: 9500, type: WidthType.DXA }, // Explicit DXA width for Pages compatibility
      columnWidths: [700, 3500, 700, 1200, 1500, 1900], // Adjusted for better fit
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      },
      layout: 'fixed' as any, // Fixed layout for consistent rendering
    });
  }

  /**
   * Add chapter to document
   */
  addChapter(chapterId: ChapterId, chapterTitle: string, content: string): void {
    const children: any[] = [];
    const isFirstChapter = chapterId === '01';

    // Add chapter title with page break (except first chapter)
    children.push(this.createChapterTitle(chapterId, chapterTitle, isFirstChapter));

    // Special handling for Chapter 06 - Schedule B
    if (chapterId === '06') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'BILL OF QUANTITIES',
              font: 'Times New Roman',
              size: 28,
              bold: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 240 },
        })
      );
      children.push(this.createScheduleBTable());
    } else {
      // Parse content
      const paragraphs = this.parseContentToParagraphs(content);
      children.push(...paragraphs);
    }

    this.sections.push(...children);
  }

  /**
   * Build final Word document
   * 
   * COMPATIBILITY NOTES:
   * - Uses single section with page breaks (not section breaks) for Apple Pages compatibility
   * - Explicit table widths in DXA units for consistent rendering
   * - Built-in Word styles only (Heading 1, Normal)
   * - Microsoft Word is the source of truth; Pages should render reasonably
   */
  build(): Document {
    return new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
              borders: {
                pageBorders: {
                  display: PageBorderDisplay.ALL_PAGES,
                  offsetFrom: PageBorderOffsetFrom.PAGE,
                  zOrder: PageBorderZOrder.FRONT,
                },
                pageBorderTop: {
                  style: BorderStyle.SINGLE,
                  size: 6, // 0.75pt (6 eighths of a point)
                  color: '000000',
                },
                pageBorderBottom: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: '000000',
                },
                pageBorderLeft: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: '000000',
                },
                pageBorderRight: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: '000000',
                },
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Public Works Department, Maharashtra',
                      font: 'Times New Roman',
                      size: 20,
                      bold: true,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: this.inputForm.nameOfWork,
                      font: 'Times New Roman',
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 120 },
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Page ', font: 'Times New Roman', size: 20 }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: 'Times New Roman',
                      size: 20,
                    }),
                    new TextRun({ text: ' of ', font: 'Times New Roman', size: 20 }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      font: 'Times New Roman',
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 120 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Contractor's Signature & Seal: _____________________",
                      font: 'Times New Roman',
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 60 },
                }),
              ],
            }),
          },
          children: this.sections,
        },
      ],
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [
              {
                level: 0,
                format: NumberFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.LEFT,
              },
            ],
          },
        ],
      },
    });
  }
}

// ===========================
// MAIN GENERATION FUNCTION
// ===========================

async function generateWordTender(): Promise<void> {
  console.log('🚀 Starting Word-Based Tender Generation...\n');
  console.log('=' .repeat(70));
  console.log('WORD (.docx) AS PRIMARY AND AUTHORITATIVE FORMAT');
  console.log('=' .repeat(70));
  console.log('');

  // Step 1: Check Ollama health
  console.log('1️⃣  Checking Ollama availability...');
  const health = await checkLlmHealth();
  if (!health.available) {
    console.error('❌ Ollama is not available:', health.errorMessage);
    console.error('\nPlease ensure Ollama is running:');
    console.error('  $ ollama serve');
    process.exit(1);
  }
  console.log(`✅ Ollama is running: ${health.modelName || 'available'}\n`);

  // Step 2: Generate realistic input
  console.log('2️⃣  Generating realistic tender input data...');
  const inputForm = generateRealisticTenderInput();
  console.log('✅ Input data generated:');
  console.log(`   Project: ${inputForm.nameOfWork}`);
  console.log(`   Authority: ${inputForm.authority}`);
  console.log(`   Location: ${inputForm.location}`);
  console.log(`   Estimated Cost: ₹${(inputForm.estimatedCost / 10000000).toFixed(2)} Crore`);
  console.log(`   Time: ${inputForm.timeForCompletion} months`);
  console.log(`   EMD: ₹${(inputForm.emd / 100000).toFixed(2)} Lakh`);
  console.log(`   Security Deposit: ${inputForm.securityDepositPercent}%`);
  console.log(`   Contractor Class: ${inputForm.contractorClass}\n`);

  // Step 3: Generate all chapters
  console.log('3️⃣  Generating chapters (01-09)...\n');
  const chapters: Record<string, { content: string; success: boolean; error?: string }> = {};

  for (const chapterId of CHAPTER_ORDER) {
    process.stdout.write(`   Chapter ${chapterId}: Generating... `);
    const startTime = Date.now();

    try {
      const result = await generateChapter(chapterId as ChapterId, inputForm);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.success && result.content) {
        chapters[chapterId] = { content: result.content, success: true };
        console.log(`✅ (${duration}s)`);
      } else {
        chapters[chapterId] = {
          content: '',
          success: false,
          error: result.error || 'Unknown error',
        };
        console.log(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      chapters[chapterId] = {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      console.log(`❌ Error (${duration}s): ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  // Step 4: Build Word document
  console.log('\n4️⃣  Building Word document...');
  
  const builder = new TenderDocumentBuilder(inputForm);

  // Chapter metadata
  const chapterTitles: Record<string, string> = {
    '01': 'Tender Notice',
    '02': 'Detailed Tender Notice',
    '03': 'Agreement Form B-1',
    '04': 'Additional General Conditions of Contract',
    '05': 'General Notes Regarding Material & Schedule A',
    '06': "Schedule 'B'",
    '07': 'Additional Specifications',
    '08': 'Proforma of Surety Bond, Guarantee Bond, Indemnity Bond & C.E. Circulars',
    '09': 'Drawings',
  };

  for (const chapterId of CHAPTER_ORDER) {
    const chapter = chapters[chapterId];
    if (chapter.success) {
      builder.addChapter(chapterId as ChapterId, chapterTitles[chapterId], chapter.content);
    } else {
      builder.addChapter(
        chapterId as ChapterId,
        chapterTitles[chapterId],
        `[GENERATION FAILED]

Error: ${chapter.error || 'Unknown error'}

This chapter could not be generated automatically.`
      );
    }
  }

  const doc = builder.build();

  // Step 5: Save Word document
  console.log('5️⃣  Saving Word document...');
  
  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, 'sample_tender_v1.docx');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Word document saved: ${outputPath}\n`);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('GENERATION SUMMARY');
  console.log('='.repeat(70));

  const successCount = Object.values(chapters).filter(ch => ch.success).length;
  const failCount = CHAPTER_ORDER.length - successCount;

  console.log(`✅ Successfully generated: ${successCount}/${CHAPTER_ORDER.length} chapters`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} chapters`);
    const failedChapters = CHAPTER_ORDER.filter(id => !chapters[id].success);
    failedChapters.forEach(id => {
      console.log(`   - Chapter ${id}: ${chapters[id].error}`);
    });
  }

  console.log('\n📁 Output file:');
  console.log(`   ${outputPath}`);
  console.log('\n✅ Word-based tender generation complete!');
  console.log('\n💡 This document is fully editable in Microsoft Word.');
  console.log('   - Professional formatting');
  console.log('   - Native Word styles and structure');
  console.log('   - Headers, footers, and page numbering');
  console.log('   - Editable BOQ table with 40 items');
  console.log('   - Ready for commercial use with minor refinement\n');
}

// Execute
generateWordTender().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
