# Research Report — AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement

**SIH 2025 · Problem Statement 26100 · Ministry of Petroleum & Natural Gas / Chennai Petroleum Corporation Limited (CPCL)**

> Purpose: a factual, source-cited research base for building an automated platform that ingests a bidder's documents/registrations, verifies them against issuing authorities, cross-checks consistency across portals, and produces a compliance score + risk classification for the procurement officer. All source URLs are cited inline.

---

## Table of Contents
1. [GeM procurement end-to-end](#1-gem-procurement-end-to-end)
2. [Compliance areas — what, who issues, valid format, why verify](#2-compliance-areas)
   - [ID/registration format quick-reference table](#id-format-quick-reference-table)
   - Udyam/MSME · GST · PAN/Income-Tax · MCA21/CIN · Startup India (DPIIT) · NSIC (SPRS) · EPFO · ESIC · DigiLocker · Make in India / Local Content (PPP-MII) · BIS · OEM Authorization/MAF · Blacklisting/Debarment
3. [Fraud & malpractice patterns and risk signals](#3-fraud--malpractice-patterns)
4. [Compliance score & risk classification methodology](#4-compliance-score--risk-classification)
5. [Governing rules & circulars](#5-governing-rules--circulars)
6. [Design implications for the platform](#6-design-implications-for-the-platform)
7. [Source URLs](#7-source-urls)

---

## 1. GeM procurement end-to-end

**What GeM is.** Government e-Marketplace (GeM) is India's national public-procurement portal, launched **9 August 2016** by the Ministry of Commerce & Industry, run by **GeM SPV** (a 100% government-owned non-profit). Its use by government buyers is **mandated by Rule 149 of the General Financial Rules (GFR), 2017**. It replaced the erstwhile DGS&D. By 2026 it had crossed **₹20 lakh crore** cumulative procurement; MSEs account for ~45% of GMV. (Wikipedia: Government e Marketplace; en.wikipedia.org/wiki/Government_e_Marketplace)

**Three pillars:** transparency, efficiency, inclusiveness. Procurement modes offered: **direct purchase, L1 bidding, e-bidding, forward/reverse auction**.

### 1.1 Buyer-side flow (procuring entity, e.g., CPCL)
1. **Demand + Annual Procurement Plan (APP).** Under GFR Rule 148 each ministry/PSU publishes an APP on GeM within 90 days of the FY start. (cssmitra.in GFR Chapter-6 guide)
2. **Category & specification.** Buyer selects product/service category; specifications must be **generic/neutral** (GFR Rule 144 prohibits "tailor-made" specs that fit only one vendor).
3. **Choice of buying method by value:**
   - **Direct Purchase** (low value) — buy directly from a listed product at the displayed price.
   - **L1 Purchase / Comparison** — pick the lowest-priced (L1) among listed offers meeting spec.
   - **Bid** — publish a bid with eligibility + technical + financial requirements when value exceeds thresholds (typically bids/competitive selection above ₹25,000, and mandatory bidding/RA above higher thresholds).
   - **Reverse Auction (RA)** — live price competition among technically qualified bidders.
4. **Publish bid** with: eligibility (turnover, past experience, OEM/MAF, MSE/MII conditions), technical specs, EMD/bid security, ePBG, delivery, and ATC (Additional Terms & Conditions).
5. **Technical evaluation** → **Financial evaluation** → **(optional) Reverse Auction** → **Award** to L1.
6. **Contract → delivery → GRN (Goods Receipt Note) → inspection (GFR 169) → payment (GFR 170; 10 working days on GeM; 45 days statutory for MSEs).**

Typical status pipeline on the seller dashboard: *Bid Published → Bids Under Technical Evaluation → Technically Qualified → Financially Opened → (Under Reverse Auction) → Awarded.* (tenderkart.in, clearbid.in, swcybernetics.in)

### 1.2 Seller onboarding (where compliance data originates)
A seller registers with: **PAN, Aadhaar/OTP of authorised signatory, GSTIN, business/constitution proof, bank account (for payments), email/mobile OTP**. Sellers self-declare MSE/Startup/MII status and upload supporting certificates. Manufacturers create **brands** and **OEM panels**; resellers must hold an **OEM Authorization / Manufacturer Authorization Form (MAF)** to list a brand. **This self-declared, document-upload nature is exactly where fraud enters — and where automated verification adds value.**

### 1.3 Technical vs financial evaluation
- **Technical evaluation:** does the bidder + product meet mandatory eligibility and specifications? Checks: legal existence (PAN/GST/CIN), turnover & experience thresholds (or exemptions for MSE/Startup), OEM/MAF authenticity, BIS/quality certs, local-content class (Class-I/II), documentary compliance (ATC). Non-compliant bids are **rejected before price is opened**.
- **Financial evaluation:** only technically qualified bids' prices are compared. Lowest evaluated price = **L1**. Preferences (MSE purchase preference, MII purchase preference) are applied here.

### 1.4 L1, bidding, and reverse auction
- **L1 ("Lowest-1"):** the lowest-priced technically compliant bidder; the default award principle in Indian public procurement (GFR).
- **Bidding:** sealed technical + financial bids; buyer evaluates, then awards to L1. Below the RA threshold, award goes directly to L1 from the sealed financial bids. (clearbid.in)
- **Reverse Auction (RA):** a real-time, timed online price-reduction event where **technically qualified** bidders competitively lower prices to become L1. Common mechanics: only a subset (e.g., lowest ~50%) of qualified bidders may enter; decrement rules; auto-extension (e.g., 15-minute) on last-minute bids; MSE/MII price-band advantages applied. (tenderflowpro.in, bidz365.com, tenderdekho.com)

---

## 2. Compliance areas

### ID format quick-reference table

| # | Registration / ID | Issuing authority | Length & pattern | Regex (validation) | Key embedded fields |
|---|---|---|---|---|---|
| 1 | **PAN** | Income Tax Dept (CBDT) | 10 chars: `AAAAA9999A` | `^[A-Z]{5}[0-9]{4}[A-Z]$` | 4th char = holder type (P/C/F/H/A/T/B/L/J/G); 5th = 1st letter of surname/entity; 10th = checksum |
| 2 | **GSTIN** | CBIC / GSTN | 15 chars: `27ABCDE1234F2Z5` | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$` | 1-2 state code; 3-12 = PAN; 13 = entity serial for that PAN in state; 14 = 'Z' (default); 15 = checksum |
| 3 | **Udyam (MSME)** | Ministry of MSME / Udyam portal | 19 chars: `UDYAM-XX-00-0000000` | `^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$` | XX = state code; 00 = district code; 7-digit serial |
| 4 | **CIN** | MCA / Registrar of Companies | 21 chars: `L01631KA2010PTC096843` | `^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$` | 1: L=listed/U=unlisted; 2-6 industry (NIC); 7-8 state; 9-12 year; 13-15 company type (PLC/PTC/OPC/NPL/FTC/GOI/SGC…); 16-21 ROC reg no. |
| 5 | **DPIIT/Startup Recognition** | DPIIT (Startup India) | `DIPP` + number (e.g., `DIPP260…`) | `^DIPP[0-9]+$` | Verifiable on startupindia.gov.in |
| 6 | **NSIC SPRS (GP) certificate** | NSIC (Ministry of MSME) | Alphanumeric GP reg no. (validity 2 yrs) | issuer-verified | Monetary limit, store items, category |
| 7 | **EPFO establishment code** | EPFO | 7-digit est. code; full PF no. `RG/OFF/0000000/000` | `^[A-Z]{2}/[A-Z]{3}/[0-9]{7}/[0-9]{3}$` (full) | region / office / est code / extension |
| 8 | **ESIC employer code** | ESIC | 17-digit numeric employer code | `^[0-9]{17}$` | first digits encode region/office |
| 9 | **BIS – ISI licence (CM/L)** | Bureau of Indian Standards | `CM/L-XXXXXXX` (≈7 digits) | `^CM/L-?[0-9]{6,8}$` | Grant of Licence for ISI-marked products; tied to IS standard |
| 10 | **BIS – CRS registration (R-no.)** | BIS (MeitY notified electronics) | `R-XXXXXXXXX` (10-digit) | `^R-?[0-9]{10}$` | Compulsory Registration Scheme; per model/brand |
| 11 | **TAN** (supporting) | Income Tax Dept | 10 chars `ABCD99999E` | `^[A-Z]{4}[0-9]{5}[A-Z]$` | TDS deduction account |
| 12 | **LLPIN** (for LLPs) | MCA | 7-char alphanumeric | `^[A-Z]{3}-?[0-9]{4}$` | LLP identity (CIN not issued to LLPs) |

> Sources for the above: PAN (en.wikipedia.org/wiki/Permanent_account_number); GSTIN (cleartax.in/s/know-your-gstin); CIN (cleartax.in/s/cin-corporate-identification-number, bimakavach.com); Udyam (instantudyam.com, udyam.ltd, nbassociates.net); DPIIT (startupindia.gov.in validate page); NSIC (nsic.co.in); EPFO (epfguide.com, epfindia.gov.in); ESIC (hrtailor.com, indianhrm.com, portal.esic.gov.in); BIS (bqcindia.com, global-approbation.com, instacertify.com).

---

### 2.1 Udyam / MSME registration
- **What:** the single online registration that classifies an enterprise as **Micro, Small or Medium** (MSME) under the MSMED Act, 2006. Replaced Udyog Aadhaar (from 1 July 2020). Free, PAN- & GSTIN-linked, self-declared but validated against Income-Tax/GST data.
- **Who issues:** Ministry of MSME via **udyamregistration.gov.in**. A permanent **Udyam Registration Number (URN)** is issued.
- **Valid document:** e-certificate showing URN `UDYAM-XX-00-0000000`, enterprise name, PAN, GSTIN, major activity (manufacturing/service), NIC codes, social category, date of commencement, and classification (Micro/Small/Medium). Verifiable via the portal's "Verify Udyam" (URN + OTP).
- **Benefits in GeM procurement (why it matters):** MSEs (Micro & Small) get **exemption from EMD/bid security and tender-fee**, **purchase preference (L1+15% price band → chance to match L1 for up to 25% of order when L1 is a non-MSE)**, and are the target of the **25% MSE procurement mandate** (4% SC/ST-owned, 3% women-owned). (dcmsme.gov.in FAQs; pib.gov.in PRID 2040253; GFR Rule 153A per cssmitra.in)
- **Why verify:** false MSE claims fraudulently capture EMD exemption, purchase preference and reserved procurement; a large trader/company may masquerade as "Micro". The officer must confirm URN validity, that PAN/GSTIN on the URN match the bidder, and that classification is current (turnover/investment can push an enterprise out of "Micro/Small").

### 2.2 GST registration + return-filing status
- **What:** GST registration = legal authorisation to collect GST and claim Input Tax Credit; identified by the **15-digit GSTIN**. **Return filing** (GSTR-1 = outward supplies; GSTR-3B = summary + tax payment) evidences that the business is *active and transacting*.
- **Who issues:** CBIC; IT backbone by **GSTN** (note GSTIN ≠ GSTN). Verify on **gst.gov.in → Search Taxpayer** (legal/trade name, status = **Active**, taxpayer type, jurisdiction, and **return-filing table**). (cleartax.in/s/know-your-gstin)
- **Valid document/format:** GSTIN `27ABCDE1234F2Z5` — state code (27=Maharashtra) + PAN (chars 3-12) + entity code + `Z` + checksum. GST certificate (REG-06) shows legal name, trade name, PAN, address, date of liability.
- **Why verify:** confirm the GSTIN is **Active** (not cancelled/suspended), that the **PAN inside the GSTIN equals the bidder's PAN** (a strong cross-portal consistency check), that the legal name matches, and that **returns are filed** (chronic non-filing signals a dormant/shell entity or financial distress). Fully fake GSTINs are rare but **inactive/misused GSTINs** are common. (cleartax.in)

### 2.3 PAN + Income-Tax compliance
- **What:** 10-character alphanumeric issued under s.139A of the Income-tax Act; universal financial identifier of a person/entity.
- **Who issues:** Income Tax Department (CBDT) via Protean (ex-NSDL) / UTIITSL. (en.wikipedia.org/wiki/Permanent_account_number)
- **Format intelligence:** 4th char encodes **holder type** — `P`=Individual, `C`=Company, `F`=Firm, `H`=HUF, `A`=AOP, `T`=Trust, `B`=BOI, `L`=Local authority, `J`=Artificial juridical person, `G`=Government; 5th char = first letter of surname/entity name; 10th char = checksum. So `AAACX1234C` (4th=`C`) must be a company — a mismatch against a bidder claiming to be a proprietorship is a red flag.
- **Why verify:** PAN is the **join key** across GST (embedded), MCA (company PAN), MSME (Udyam), EPFO/ESIC, and bank. Confirm PAN validity/status, name match, and holder-type consistency with the declared constitution. Multiple/duplicate or fabricated PANs are a known fraud (the IT Dept has destroyed lakhs of duplicate PANs). (en.wikipedia.org/wiki/Permanent_account_number)

### 2.4 MCA21 (company registration / CIN / director details)
- **What:** MCA21 is the Ministry of Corporate Affairs' portal holding the master data of every registered company/LLP: incorporation, directors (DINs), charges, filing/compliance status, and the **CIN**.
- **Who issues:** Registrar of Companies (ROC) under MCA; CIN allotted automatically via **SPICe+** at incorporation.
- **CIN structure (21 chars, `L01631KA2010PTC096843`):** (1) listing status `L`/`U`; (2-6) NIC industry code; (7-8) state; (9-12) year of incorporation; (13-15) company class (`PLC` public, `PTC` private, `OPC`, `NPL` s.8, `FTC` foreign-subsidiary, `GOI`, `SGC`, `ULT/ULL` unlimited, etc.); (16-21) ROC registration number. Note: **LLPs get a 7-char LLPIN, not a CIN.** (cleartax.in/s/cin-corporate-identification-number)
- **Why verify:** confirm the company exists, is **Active** (not "Struck off"/"Under liquidation"), incorporation date supports claimed "years of experience", the **year embedded in CIN matches** the claimed vintage, directors are not disqualified/overlapping with other bidders (a shell/related-party signal), and the company's PAN matches. The MCA "Find CIN"/master-data and DIN services enable director-level cross-checks for **cartel/shell detection**.

### 2.5 Startup India (DPIIT recognition)
- **What:** official recognition of an entity as a "Startup" under Startup India. Certificate carries a recognition number in the **`DIPP…`** format.
- **Who issues:** **DPIIT** (Dept. for Promotion of Industry and Internal Trade). Verify/download on **startupindia.gov.in → Validate/Download Certificate** (e.g., `DIPP260`). Eligibility (2024-25): entity < 10 years old, turnover < ₹100–200 cr, working on innovation/scalability. (startupindia.gov.in; patronaccounting.com)
- **Benefits in procurement (why it matters):** DPIIT-recognised startups get **exemption/relaxation on prior turnover, prior experience, and EMD** in public procurement, and can be listed on GeM (**GeM Startup Runway**). (dpiit.gov.in startup-india-initiative; indiafilings.com; cssmitra.in — noting the relaxation is intended for the startup's *own innovative* product/service, not everything it resells).
- **Why verify:** startup status unlocks the same EMD exemption + experience waivers as MSEs; a false claim lets an unqualified bidder bypass turnover/experience gates. Confirm DIPP number validity, entity-name/PAN match, and that recognition is live (not expired/withdrawn).

### 2.6 NSIC — Single Point Registration Scheme (SPRS)
- **What:** NSIC enlists Micro & Small Enterprises under **SPRS** so they can access government-purchase benefits under the MSE Order 2012 with a single registration ("GP" certificate).
- **Who issues:** **National Small Industries Corporation (NSIC)**, Ministry of MSME, online at nsicspronline.com. (nsic.co.in/Schemes/SinglePointRegistration)
- **Valid document / key facts:** GP registration certificate — **validity 2 years**; carries a **monetary limit** (fixed from audited turnover), the registered **store items**, and category. Provisional registration (₹5 lakh limit) for units < 1 year old. **Traders are ineligible**; blacklisted units and units whose proprietor/partner/director is criminally convicted are ineligible.
- **Benefits:** free tender documents, **full EMD exemption**, **L1+15% purchase-preference band**, consortium facility; eligibility for the 25% MSE reservation and 358 reserved items. (nsic.co.in)
- **Why verify:** confirm certificate validity (2-yr expiry), that the **specific item being bid is within the registered store list and monetary limit**, that the unit is not a trader, and that it is Udyam-registered. Expired or scope-exceeding SPRS certs are a common cause of wrongful benefit claims.

### 2.7 EPFO (Provident Fund) compliance
- **What:** registration of an establishment with the Employees' Provident Fund Organisation and regular ECR (monthly contribution) filing — evidence of a genuine, staffed, law-abiding employer (relevant for services/manpower tenders).
- **Who issues:** **EPFO** (Ministry of Labour & Employment); registration via Shram Suvidha. **7-digit establishment code**; full PF number looks like `TN/MAS/0031309/000` (region/office/establishment/extension). Public **Establishment Search** on the EPFO employer portal. (epfguide.com; unifiedportal-emp.epfindia.gov.in)
- **Why verify:** many service/manpower bids require valid PF registration and up-to-date remittances; PF-default or a missing code indicates the bidder cannot legally deploy manpower or is understating its workforce. Cross-check the establishment name/PAN and the **LIN (Labour Identification Number)** that unifies EPFO/ESIC codes on Shram Suvidha.

### 2.8 ESIC compliance
- **What:** registration under the ESI Act, 1948 (health/social-security cover for employees) — mandatory for covered establishments; another genuineness signal for services tenders.
- **Who issues:** **ESIC** (Ministry of Labour & Employment). Employer files **Form-01**; on submission a **17-digit employer code** and a digitally-signed **C-11** letter are generated. Public **Employer Search** on portal.esic.gov.in. (indianhrm.com; hrtailor.com)
- **Why verify:** confirm a valid 17-digit code, name/PAN match, and active status for manpower/services procurement. Absence or lapse suggests non-compliance with labour law or overstated employee strength.

### 2.9 DigiLocker document verification
- **What:** MeitY's digital document wallet under Digital India. **Issuer-pushed** documents (e.g., PAN, driving licence, degrees, GST/company docs where integrated) are **at par with originals** under Rule 9A of the IT (Preservation & Retention…) Rules; each has an issuer + document URI enabling machine verification.
- **Who issues/operates:** MeitY / NeGD (digilocker.gov.in).
- **Why verify / how the platform uses it:** prefer **DigiLocker-fetched or issuer-signed** documents over user-uploaded PDFs, because uploaded scans are the primary vector for **forged/edited certificates**. DigiLocker's issuer verification + document URI gives a tamper-evident channel; the platform can request consented pull or validate the DigiLocker signature/QR instead of trusting an uploaded image.

### 2.10 Make in India / Local Content — PPP-MII Order 2017
- **What:** the **Public Procurement (Preference to Make in India) Order, 2017 (PPP-MII)** grants purchase preference to domestic suppliers by **local content (LC)**. Issued by **DPIIT** (Order P-45021/2/2017-B.E.-II dated 15.06.2017; revised 28.05.2018, 29.05.2019, 04.06.2020, 16.09.2020, 19.07.2024) under **GFR Rule 153**. (tec.gov.in/PPPMII/about; pib.gov.in relid=165658; dpiit.gov.in)
- **Supplier classes (by local content):**
  - **Class-I local supplier:** LC **≥ 50%**.
  - **Class-II local supplier:** LC **> 20% and < 50%**.
  - **Non-local supplier:** LC **≤ 20%**.
- **Key rules:** unless global bids are invited, **only Class-I and Class-II** may bid for purchases **< ₹200 crore**; where the nodal ministry certifies sufficient local capacity, **only Class-I** may bid (any value). **Margin of purchase preference = 20%.** Default LC thresholds are **50%/20%** unless a nodal ministry notifies higher. Bidders **self-certify** LC %; above ₹10 crore, a statutory auditor/CA/CS certificate is required. (tec.gov.in; tenderkart.in; tenderflowpro.in)
- **Purchase-preference mechanics (interaction with MSE & L1):** if L1 is a non-Class-I supplier and a Class-I supplier's bid is within the preference margin, the Class-I supplier may be awarded (or given the balance) at L1 price. (mazagondock.in PPP policy note)
- **Complaint/verification mechanism:** false LC claims can be challenged; complaint fee **₹2 lakh or 1% of value (max ₹5 lakh)**, forfeited if the complaint is baseless, refunded if upheld; a designated committee (e.g., TEC for telecom) does independent LC verification of self-declarations. (tec.gov.in)
- **Why verify:** LC is **self-declared**, so it is highly susceptible to inflation to gain Class-I eligibility/preference. The platform should flag LC claims lacking the required CA/CS certificate (above threshold), inconsistent country-of-origin declarations, and Class-I claims on obviously imported goods.

### 2.11 BIS certification / product standards
- **What:** Bureau of Indian Standards certification that a product meets an Indian Standard (IS). Two main schemes:
  - **ISI Mark (Scheme-I):** Grant of Licence with a **CM/L number** (`CM/L-XXXXXXX`), shown with the ISI mark and the relevant IS (e.g., IS 302). (bqcindia.com; psrcompliance.com)
  - **CRS (Compulsory Registration Scheme)** for MeitY-notified electronics/IT: **10-digit R-number** (`R-XXXXXXXXX`) with the BIS Standard Mark. (global-approbation.com; instacertify.com)
- **Who issues:** BIS (bis.gov.in / Manak portal), verifiable by CM/L or R-number, filterable by brand/IS.
- **Why verify:** many product tenders mandate BIS conformity. Fraud patterns: quoting a **CM/L or R-number that belongs to a different brand/model**, expired licences, or a licence covering a different IS/variant. Verify the number on the BIS portal and confirm **brand + model + IS** all line up with the offered item.

### 2.12 OEM Authorization / Manufacturer Authorization Form (MAF) on GeM
- **What:** where a **reseller/authorised distributor** (not the manufacturer) bids, GeM requires a **Manufacturer's Authorization Form (MAF) / OEM Authorization Certificate** — a letter on the OEM's letterhead authorising that specific reseller for specific products, with OEM contact details, and committing the OEM to notify GeM of changes. GeM also uses an **OEM Authorization Code** (issued by the manufacturer's brand/OEM panel) to link a reseller to a brand. (bidplus.gem.gov.in tender docs; fulfilment.gem.gov.in MAF; gemtenderservice.com; professionalutilities.com)
- **Who issues:** the OEM/brand owner (verifiable via the OEM's GeM brand/OEM panel and the authorization code).
- **Why verify:** forged/expired/generic MAFs are a frequent malpractice — a reseller lists a brand it is not authorised for, or reuses an old MAF. The platform should validate the MAF's OEM identity, the reseller name, product scope, validity dates, and (where possible) the GeM OEM authorization code against the OEM panel.

### 2.13 Blacklisting / debarment
- **What:** exclusion of a firm from bidding due to fraud, default, or misconduct.
- **Legal basis & where published:**
  - **GFR Rule 151** ("Debarment from Bidding") + **DoE guidelines** (OM F.1/20/2018-PPD, 02.11.2021) — a bidder can be debarred for submitting **fake/false documents**, breach of code of integrity, non-performance, etc. (doe.gov.in; staffnews.in)
  - **GeM Incident Management Policy** — GeM maintains **watch-listed/suspended/blocked** sellers and buyers (gem.gov.in/incidentmanagement/sellers). 
  - **CPPP / eProcurement debarment list** — central debarment list at **eprocure.gov.in** (`FrontEndDebarmentList`). 
  - **Ministry/PSU-specific banned-firm lists** (e.g., DVC publishes debarred agencies and points to the GeM-CPPP India-wide list). (dvc.gov.in)
- **Why verify:** a debarred/blacklisted firm (or its directors/related entities) must be screened out **before** award. The platform should match the bidder — and its **directors/PAN/related entities** — against GeM, CPPP, MCA "struck-off", and ministry banned lists (name/PAN/CIN/director-DIN matching to defeat re-incorporation under a new name).

---

## 3. Fraud & malpractice patterns

### 3.1 Document/identity fraud
- **Fake/forged certificates:** edited PDFs of Udyam, GST, BIS, MAF, turnover/experience certificates, bank guarantees. In a CCI-investigated UP soil-testing tender, bidders issued **fake work orders and experience certificates** to enable cover bidders to qualify; some had **no testing machines at all**. (lkslaw.com)
- **Expired/lapsed registrations** presented as current (SPRS 2-yr expiry, BIS licence expiry, MAF validity, GST cancelled/suspended).
- **Mismatched details across portals:** name/PAN/address that differ between PAN, GSTIN (PAN embedded), Udyam, MCA, EPFO/ESIC and the bid form — the single strongest automatable signal.
- **Misrepresented status:** large firm posing as **Micro/Small** (EMD exemption + preference), non-startup claiming **DPIIT** benefits, reseller posing as **OEM**, importer claiming **Class-I local content**.
- **Inflated turnover/experience** to clear eligibility gates.
- **Duplicate/fabricated PANs** and multiple entities behind one beneficial owner.

### 3.2 Shell companies & related-party rings
Signals: very recent incorporation (year embedded in CIN) vs claimed experience; shared **directors/DINs, PAN, address, phone, email, bank account, or IP address** across "competing" bidders; dormant GST (no GSTR-3B/GSTR-1 filing); no EPFO/ESIC footprint despite claiming manpower; "struck-off" or under-liquidation status on MCA.

### 3.3 Cartelization / bid rigging (Competition Act s.3(3)(d))
Bid rigging is **per se** anti-competitive; the CCI presumes appreciable adverse effect on competition. Recognised techniques (lkslaw.com; taxtmi.com):
- **Collusive/identical pricing** (pre-agreed or identical quotes).
- **Cover (courtesy) bidding** — deliberately high losing bids to fake competition.
- **Bid rotation** — pre-agreed winners take turns.
- **Bid suppression** — colluders don't bid / withdraw so a chosen firm wins.
- **Market/geographic allocation** — carving up zones/customers.
- **Proxy bidding** — dummy participants to prevent re-tender.

**Detection red flags (used by CCI in real cases):** identical bids/identical rate reductions despite different geographies and cost structures; **common IP addresses / common login times**; sequential bid numbers; emails/spreadsheets showing pre-allocation; near-identical prices with divergent profit margins (implying manipulated cost). Landmark/illustrative outcomes: **CCI penalised HP India + 21 resellers ₹142.37 crore for bid-rigging/cartelization on GeM tenders (July 2026)**; **₹671 crore on 4 PSU insurers (RSBY Kerala)**; multiple **Indian Railways** protective-tube / brake-block cartels (5% of turnover penalties). (scconline.com; indusbusinessjournal.com; lkslaw.com)

### 3.4 Other procurement malpractices
- **Tailor-made specifications** favouring one vendor (GFR Rule 144 violation even under open tender).
- **EMD/PBG fraud** (fake bank guarantees).
- **Country-of-origin / MII mislabeling** (GeM mandates country-of-origin display).

### 3.5 Consolidated risk-signal catalogue (for the engine)
| Category | Concrete signal |
|---|---|
| Identity mismatch | PAN in GSTIN ≠ bidder PAN; name/address differs across PAN/GST/Udyam/MCA |
| Validity | GST cancelled/suspended; SPRS/BIS/MAF expired; company struck-off |
| Status misuse | Non-MSE claiming MSE; non-startup claiming DPIIT; reseller claiming OEM; importer claiming Class-I |
| Genuineness | Dormant GST (no returns); no EPFO/ESIC despite manpower claim; incorporation year vs experience |
| Collusion | Shared director/DIN/PAN/address/email/phone/IP/bank across bidders; identical prices/decrements |
| Debarment | Bidder/director on GeM, CPPP, or ministry banned lists; MCA disqualified director |
| Document integrity | Uploaded PDF fails signature/QR/DigiLocker verification; certificate number not found on issuer portal |

---

## 4. Compliance score & risk classification

### 4.1 What it is
A **compliance/vendor-risk score** condenses many verification checks into a single, explainable number + a **risk band** (e.g., Low / Medium / High or Green / Amber / Red) that a procurement officer can act on. It is standard practice in vendor due-diligence / third-party risk management (TPRM), adapted here to Indian public-procurement compliance.

### 4.2 How it is typically computed
1. **Atomic checks** each return a status: `PASS / FAIL / WARN / NOT_APPLICABLE / UNVERIFIABLE` plus a confidence.
2. **Group into weighted dimensions**, e.g.:
   - **Legal existence & identity** (PAN/GST/CIN valid, active, consistent) — high weight.
   - **Tax & financial health** (GST return-filing regularity, turnover evidence) — high weight.
   - **Statutory/labour compliance** (EPFO, ESIC where applicable) — medium.
   - **Eligibility-claim authenticity** (MSE/Udyam, Startup/DPIIT, NSIC, MII/Class, OEM/MAF, BIS) — high (these unlock benefits/qualification).
   - **Integrity/exclusion** (blacklisting/debarment, director-overlap, cartel signals) — **veto / critical**.
   - **Document integrity** (DigiLocker/issuer-verified vs unverifiable upload) — medium.
3. **Score = Σ(dimension_weight × normalized_dimension_score)**, typically on 0–100.
4. **Critical/knock-out rules override the weighted sum:** any confirmed **blacklisting, fake document, or cancelled GST/struck-off company** forces **High risk / disqualify** regardless of other points. Cross-portal **PAN mismatch** is a hard fail.
5. **Handle "unverifiable"** distinctly from "fail" (e.g., issuer portal down → WARN, request manual review), so the score is honest about coverage.

### 4.3 Illustrative weighting (starting point — tune with domain input)
| Dimension | Example weight | Example checks |
|---|---|---|
| Identity & legal existence | 25% | PAN valid+type, GSTIN active, CIN active, cross-portal name/PAN match |
| Tax & financial | 20% | GSTR-1/3B filing streak, turnover vs eligibility |
| Eligibility-claim authenticity | 20% | Udyam/MSE, DPIIT, NSIC scope+validity, MII class + CA cert, OEM/MAF, BIS number match |
| Statutory/labour | 10% | EPFO code active, ESIC code active (if manpower) |
| Document integrity | 10% | DigiLocker/issuer-signed vs raw upload; QR/signature valid |
| Integrity & exclusion (with veto) | 15% (+ knock-out) | debarment lists, director/related-party overlap, cartel signals |

### 4.4 Risk classification output
- **Green / Low (e.g., 80–100, no critical flag):** all mandatory checks pass, documents issuer-verified → recommend proceed.
- **Amber / Medium (e.g., 50–79 or any WARN/UNVERIFIABLE):** minor gaps/expiring docs/unverifiable items → manual review before award.
- **Red / High (< 50 or any knock-out):** confirmed fake doc, debarment, cancelled GST, identity mismatch, or strong cartel signal → hold/disqualify + audit trail.

Every score should ship with a **reason breakdown** (which checks contributed, with evidence links) for auditability and to satisfy GFR transparency/accountability principles.

---

## 5. Governing rules & circulars

- **GFR 2017 (General Financial Rules)** — Dept. of Expenditure, Ministry of Finance. Chapter 6 (Rules 129–175) governs procurement of goods/services. Key rules:
  - **Rule 144** — core principles: competition, economy, efficiency, transparency, fairness, accountability; **prohibits over-specification / tailor-made specs / vendor favouritism**.
  - **Rule 148** — Annual Procurement Plan (publish on GeM within 90 days).
  - **Rule 149** — **mandatory procurement through GeM** for common goods/services.
  - **Rule 150** — registration/approved-vendor lists (basis for Limited Tender Enquiry).
  - **Rule 151** — **debarment from bidding** (fake documents, breach of integrity code).
  - **Rule 153 / 153(iii)** — statutory backing for **Make in India (PPP-MII)** preference; KVIC/handloom/cooperative reservations.
  - **Rule 153A** — **MSME preference & 25% reservation** (4% SC/ST, 3% women; EMD exemption; free tender docs; 45-day payment).
  - **Rule 147** (rate contracts), **Rule 169** (inspection/quality, risk purchase), **Rule 170** (payment terms; MSE 45-day + interest). (cssmitra.in; doe.gov.in; cag.gov.in GFR PDF)
- **Public Procurement (Preference to Make in India) Order, 2017 (PPP-MII)** — DPIIT; Class-I ≥50% / Class-II >20–<50% LC; 20% preference margin; only Class-I/II for < ₹200 cr; self-certification + CA/CS certificate above threshold; complaint mechanism. (dpiit.gov.in; tec.gov.in; pib.gov.in relid=165658)
- **Public Procurement Policy for Micro & Small Enterprises (MSEs) Order, 2012** — Ministry of MSME, under s.11 MSMED Act 2006 (effective 01.04.2012; mandatory from 01.04.2015): **25% annual procurement from MSEs (4% SC/ST + 3% women), EMD/tender-fee exemption, L1+15% purchase preference, 358 reserved items.** (sambandh.msme.gov.in; dcmsme.gov.in; nsic.co.in)
- **MSMED Act, 2006** — definition/classification of MSMEs; 45-day payment + compound interest.
- **Competition Act, 2002 — s.3(3)(d)** — bid rigging/collusive bidding presumed anti-competitive; enforced by **CCI**. (lkslaw.com; taxtmi.com)
- **DoE Guidelines on Debarment of firms from Bidding** (OM F.1/20/2018-PPD, 02.11.2021, and amendments). (doe.gov.in; staffnews.in)
- **GeM Incident Management Policy** — watch-listing/suspension/debarment on GeM. (gem.gov.in)
- **IT (Preservation & Retention) Rules — Rule 9A** — DigiLocker issued documents at par with originals.

---

## 6. Design implications for the platform

1. **PAN as the universal join key.** Extract PAN from every artefact (it is embedded in GSTIN chars 3-12, present in Udyam, MCA company master, EPFO/ESIC KYC) and reconcile. A PAN mismatch is the highest-signal, lowest-cost fraud detector.
2. **Verify against issuers, not uploads.** Prefer API/portal verification (GST Search Taxpayer, Udyam Verify, MCA Find-CIN/master-data, BIS Manak, EPFO/ESIC employer search, Startup India validate, GeM OEM panel) and **DigiLocker/issuer-signed** documents over user-uploaded PDFs. Treat raw uploads as untrusted until validated (checksum/QR/signature + OCR field cross-match).
3. **Format validation first (cheap gate).** Apply the regex table (Section 2) as a pre-filter before hitting issuer services; embedded fields (PAN 4th char, CIN year/type, GSTIN state) already catch inconsistencies offline.
4. **Status + validity, not just existence.** Check *Active/Cancelled/Struck-off/Expired* states (GST, CIN, SPRS 2-yr, BIS, MAF) — many frauds use lapsed-but-real registrations.
5. **Graph/entity-resolution layer for collusion & shells.** Build a graph of bidders ↔ directors(DIN) ↔ PAN ↔ address ↔ email/phone ↔ bank ↔ IP to surface related-party rings, cartel clusters (shared IP/login), and re-incorporated debarred firms.
6. **Debarment & exclusion screening with fuzzy matching** across GeM, CPPP (eprocure.gov.in), MCA struck-off/disqualified-director, and ministry banned lists — match on name **and** PAN/CIN/DIN to defeat renaming.
7. **Explainable scoring with knock-outs.** Weighted score + reason-coded evidence trail + hard vetoes (blacklist, fake doc, cancelled GST, identity mismatch) → Green/Amber/Red, aligned to GFR transparency/accountability.
8. **Distinguish FAIL vs UNVERIFIABLE** so officers know when a red is "confirmed fraud" vs "needs manual review".

---

## 7. Source URLs

**GeM & procurement process**
- https://en.wikipedia.org/wiki/Government_e_Marketplace
- https://tenderkart.in/blog/gem-portal-bidding-process (bidding/L1/BOQ/RA; accessed via search snippet)
- https://clearbid.in/blog/what-is-reverse-auction-in-gem-and-how-l1-pricing-works
- https://swcybernetics.in/guides/gem-tender-management
- https://tenderflowpro.in/blog/gem-portal-reverse-auction-strategy

**ID / registration formats**
- PAN: https://en.wikipedia.org/wiki/Permanent_account_number
- GSTIN: https://cleartax.in/s/know-your-gstin
- CIN: https://cleartax.in/s/cin-corporate-identification-number · https://www.bimakavach.com/blog/corporate-identification-number-cin-india/
- Udyam: https://instantudyam.com/blog/udyam-registration-number-explained/ · https://www.udyam.ltd/blog/udyam-registration-number · https://nbassociates.net/msme-number-examples/
- EPFO: https://www.epfguide.com/epfo-establishment-search/ · https://unifiedportal-emp.epfindia.gov.in/publicPortal/no-auth/misReport/home/loadEstSearchHome
- ESIC: https://www.indianhrm.com/guides/esic-form-01 · https://hrtailor.com/pf-esic-registration-guide-employers/ · https://portal.esic.gov.in/EmployerSearch
- BIS: https://bqcindia.com/BIS_ISI_Mark_Product_Certification.html · https://www.global-approbation.com/blogs/isi-vs-bis-standard-mark-vs-crs.html · https://instacertify.com/certification/india/bis-crs-mark-certificate · https://www.psrcompliance.com/blog/how-to-check-bis-certificate-online

**MSME / NSIC / Startup**
- MSE Order 2012: https://sambandh.msme.gov.in/PPP_about.aspx · https://www.dcmsme.gov.in/pppm.htm · https://www.dcmsme.gov.in/FAQs-PPP_25032022.pdf · https://pib.gov.in/Pressreleaseshare.aspx?PRID=2040253
- NSIC SPRS: https://www.nsic.co.in/Schemes/SinglePointRegistration · https://www.nsicspronline.com/
- Startup India / DPIIT: https://www.startupindia.gov.in/content/sih/en/startupgov/validate-startup-recognition.html · https://www.dpiit.gov.in/offerings/initiative/details/startup-india-initiative-and-related-schemes-1gTM1ETMtQWa · https://www.indiafilings.com/learn/dpiit-certificate-of-recognition-for-startups

**Make in India / Local Content (PPP-MII)**
- https://tec.gov.in/PPPMII/about
- https://pib.gov.in/newsite/PrintRelease.aspx?relid=165658
- https://www.dpiit.gov.in/ (PPP-MII Order 2017 & amendments, incl. 19.07.2024)
- https://tenderkart.in/blog/make-in-india-purchase-preference-class-i-class-ii-local-content
- https://tenderflowpro.in/blog/make-in-india-preference-policy-tenders

**OEM / MAF**
- https://bidplus.gem.gov.in/bidding/bid/documentdownload/3626889/1658904291.pdf (GeM MAF requirement)
- https://fulfilment.gem.gov.in/ (OEM MAF format samples)
- https://gemtenderservice.com/oem-authorization-gem-guide · https://www.professionalutilities.com/oem-authorization-code-gem

**GFR / policy**
- https://doe.gov.in/general-financial-rules-2017-updated-upto-31st-january-2026
- https://cag.gov.in/uploads/media/General-Financial-Rules-2017-English-20200627111633.pdf
- https://cssmitra.in/blog/gfr-2017-procurement-goods-complete-guide.html · https://cssmitra.in/blog/gfr-2017-gem-procurement-rules.html
- https://doe.gov.in/circulars/guidelines-debarment-firms-bidding · https://www.staffnews.in/2026/06/guidelines-on-debarment-of-firms-from-bidding.html

**Fraud / cartels / debarment**
- https://www.lkslaw.com/insights/articles/bid-rigging-in-public-procurement-an-indian-perspective
- https://www.taxtmi.com/article/detailed?id=15832
- https://www.scconline.com/blog/post/2026/07/31/cci-hp-india-resellers-cartelisation-bid-rigging-gem-tenders-competition-act/
- https://indusbusinessjournal.com/2026/07/cci-fines-hp-india-resellers-rs-142-37-crore-over-bid-rigging/
- GeM incident/watchlist: https://gem.gov.in/incidentmanagement/sellers/Watchlisted
- CPPP debarment list: https://eprocure.gov.in/eprocure/app?page=FrontEndDebarmentList&service=page
- Ministry banned list example (DVC): https://www.dvc.gov.in/cms-web/external_pages/8

---
*Compiled for SIH 2025 PS 26100. Figures/thresholds reflect sources current at time of research; verify against the latest DPIIT/DoE/MSME circulars and the live GeM GTC before implementation.*
