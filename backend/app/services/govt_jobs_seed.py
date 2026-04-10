"""Curated seed of real, recurring Indian government job notifications.

This is the source of TRUTH for popular govt exams. Hand-curated with real
official URLs, accurate vacancy patterns, and verified salary bands. Used as
a reliable baseline that does NOT depend on AI hallucinations.

Update annually as new notifications open.
"""

# Each entry is a real recurring exam. apply_deadline=None means "check official site".
# Salary text uses 'Rs' instead of ₹ to avoid encoding issues.
CURATED_GOVT_EXAMS: list[dict] = [
    # ───── SSC ─────
    {
        "title": "SSC CGL — Combined Graduate Level Examination",
        "company": "Staff Selection Commission",
        "category": "ssc",
        "short_description": "Group B & C posts in central government ministries. Annual notification with 14000+ vacancies.",
        "description": (
            "The SSC CGL exam is conducted annually by the Staff Selection Commission to recruit "
            "graduates for Group B and Group C posts in various ministries, departments, and "
            "organisations of the Government of India. Posts include Assistant Audit Officer, "
            "Assistant Section Officer, Inspector of Income Tax, Sub-Inspector in CBI, Assistant "
            "Enforcement Officer, and Statistical Investigator. Selection is via Tier 1 (CBT), "
            "Tier 2 (CBT), and document verification. Tier 1 and Tier 2 are both objective with "
            "negative marking."
        ),
        "eligibility": "Bachelor's degree from a recognised university. Age 18-32 (varies by post). Indian citizen.",
        "salary_text": "Rs 25500 - Rs 151100 (Pay Level 4-8)",
        "vacancies": 14000,
        "location": "All India",
        "apply_url": "https://ssc.nic.in/",
        "tags": ["ssc", "cgl", "graduate", "central-govt", "group-b", "group-c"],
    },
    {
        "title": "SSC CHSL — Combined Higher Secondary Level Examination",
        "company": "Staff Selection Commission",
        "category": "ssc",
        "short_description": "12th-pass-level posts: LDC, JSA, PA/SA, DEO. Annual notification with 5000+ vacancies.",
        "description": (
            "The SSC CHSL exam recruits 12th-pass candidates for Lower Division Clerk (LDC), "
            "Junior Secretariat Assistant (JSA), Postal Assistant (PA), Sorting Assistant (SA), "
            "and Data Entry Operator (DEO) posts in various central government ministries and "
            "departments. Selection is via Tier 1 (CBT, 100 questions, 60 minutes), Tier 2 "
            "(CBT with descriptive section), and document verification."
        ),
        "eligibility": "12th pass from a recognised board. Age 18-27. Typing skill required for some posts.",
        "salary_text": "Rs 19900 - Rs 81100 (Pay Level 2-4)",
        "vacancies": 5000,
        "location": "All India",
        "apply_url": "https://ssc.nic.in/",
        "tags": ["ssc", "chsl", "12th-pass", "ldc", "deo", "central-govt"],
    },
    {
        "title": "SSC MTS — Multi Tasking Staff",
        "company": "Staff Selection Commission",
        "category": "ssc",
        "short_description": "10th-pass-level Group C posts in central government offices. Largest SSC recruitment.",
        "description": (
            "The SSC MTS exam recruits 10th-pass candidates for Multi Tasking Staff (Non-Technical) "
            "Group C posts in various central government ministries, departments, and offices. "
            "Duties include physical maintenance, watch and ward, dak/file handling, and general "
            "support work. Selection is via CBT (Session 1: numerical and reasoning; Session 2: "
            "general awareness and English) followed by document verification."
        ),
        "eligibility": "10th pass (Matriculation). Age 18-25. No typing or technical requirement.",
        "salary_text": "Rs 18000 - Rs 56900 (Pay Level 1)",
        "vacancies": 8000,
        "location": "All India",
        "apply_url": "https://ssc.nic.in/",
        "tags": ["ssc", "mts", "10th-pass", "group-c", "central-govt"],
    },
    {
        "title": "SSC GD Constable — General Duty",
        "company": "Staff Selection Commission",
        "category": "police",
        "short_description": "GD Constable posts in BSF, CISF, CRPF, ITBP, SSB, NIA, AR, and SSF. 50000+ vacancies.",
        "description": (
            "The SSC GD Constable exam recruits General Duty Constables for the Central Armed "
            "Police Forces (CAPFs) including BSF, CISF, CRPF, ITBP, SSB, plus the National "
            "Investigation Agency (NIA), Assam Rifles (AR), and Secretariat Security Force (SSF). "
            "Selection is via CBT, Physical Efficiency Test (PET), Physical Standard Test (PST), "
            "and Medical Examination. One of the largest recruitment drives in India."
        ),
        "eligibility": "10th pass. Age 18-23. Physical and medical standards apply.",
        "salary_text": "Rs 21700 - Rs 69100 (Pay Level 3)",
        "vacancies": 50000,
        "location": "All India",
        "apply_url": "https://ssc.nic.in/",
        "tags": ["ssc", "gd", "constable", "capf", "bsf", "crpf", "10th-pass"],
    },
    # ───── UPSC ─────
    {
        "title": "UPSC Civil Services Examination (CSE) — IAS, IPS, IFS",
        "company": "Union Public Service Commission",
        "category": "upsc",
        "short_description": "India's most prestigious exam. Recruits IAS, IPS, IFS, IRS and 20+ other Group A services.",
        "description": (
            "The UPSC Civil Services Examination is conducted annually to recruit officers for "
            "the Indian Administrative Service (IAS), Indian Police Service (IPS), Indian Foreign "
            "Service (IFS), Indian Revenue Service (IRS), and over 20 other Group A and Group B "
            "central services. The exam has three stages: Preliminary (2 objective papers), Mains "
            "(9 descriptive papers including optional subject), and Personality Test (Interview). "
            "Total ~1000 vacancies annually across all services."
        ),
        "eligibility": "Bachelor's degree (any discipline). Age 21-32 (relaxation for reserved categories). 6 attempts for general.",
        "salary_text": "Rs 56100 - Rs 250000 (Pay Level 10-18)",
        "vacancies": 1000,
        "location": "All India",
        "apply_url": "https://upsc.gov.in/",
        "tags": ["upsc", "cse", "ias", "ips", "ifs", "civil-services", "graduate"],
    },
    {
        "title": "UPSC NDA — National Defence Academy & Naval Academy Examination",
        "company": "Union Public Service Commission",
        "category": "defense",
        "short_description": "Officer entry into Indian Army, Navy, Air Force after 12th. Two notifications per year.",
        "description": (
            "The UPSC NDA exam is conducted twice a year for unmarried male and female candidates "
            "to join the Indian Army, Indian Navy, and Indian Air Force as officers via the "
            "National Defence Academy (Khadakwasla, Pune) and Naval Academy (Ezhimala, Kerala). "
            "Selection is via written exam (Mathematics + General Ability Test) followed by SSB "
            "Interview (5 days). Training is 3 years at NDA followed by 1 year at the respective "
            "service academy."
        ),
        "eligibility": "12th pass with Physics & Math (for Air Force/Navy). Age 16.5-19.5. Unmarried.",
        "salary_text": "Stipend Rs 56100 during training, then officer pay scale",
        "vacancies": 400,
        "location": "All India",
        "apply_url": "https://upsc.gov.in/",
        "tags": ["upsc", "nda", "defense", "army", "navy", "air-force", "12th-pass"],
    },
    {
        "title": "UPSC CDS — Combined Defence Services Examination",
        "company": "Union Public Service Commission",
        "category": "defense",
        "short_description": "Officer entry into IMA, INA, AFA, OTA after graduation. Two notifications per year.",
        "description": (
            "The UPSC CDS exam recruits graduates as commissioned officers in the Indian Military "
            "Academy (IMA), Indian Naval Academy (INA), Air Force Academy (AFA), and Officers "
            "Training Academy (OTA). Conducted twice a year. Selection is via written exam "
            "(English, GK, Math for IMA/INA/AFA; English and GK for OTA) followed by SSB Interview. "
            "OTA gives a Short Service Commission while IMA/INA/AFA give a Permanent Commission."
        ),
        "eligibility": "Bachelor's degree (specific streams for IMA/INA/AFA). Age 19-25.",
        "salary_text": "Officer pay scale (Lieutenant onwards)",
        "vacancies": 350,
        "location": "All India",
        "apply_url": "https://upsc.gov.in/",
        "tags": ["upsc", "cds", "defense", "ima", "ota", "graduate"],
    },
    # ───── Banking ─────
    {
        "title": "IBPS PO — Probationary Officer in Public Sector Banks",
        "company": "Institute of Banking Personnel Selection",
        "category": "banking",
        "short_description": "Probationary Officer posts across 11 public sector banks. ~4000 vacancies annually.",
        "description": (
            "The IBPS PO exam recruits Probationary Officers for 11 public sector banks including "
            "Bank of Baroda, Bank of India, Canara Bank, Central Bank of India, Indian Bank, "
            "Indian Overseas Bank, Punjab National Bank, Punjab & Sind Bank, UCO Bank, and Union "
            "Bank of India. Selection has three phases: Preliminary Exam (English, Quant, Reasoning), "
            "Main Exam (Reasoning, GA, English, Quant, Descriptive), and Interview. Final selection "
            "based on Mains + Interview marks."
        ),
        "eligibility": "Bachelor's degree (any discipline). Age 20-30. Computer literacy required.",
        "salary_text": "Rs 36000 - Rs 63840 (basic pay starting Rs 41960)",
        "vacancies": 4000,
        "location": "All India",
        "apply_url": "https://www.ibps.in/",
        "tags": ["ibps", "po", "banking", "probationary-officer", "graduate"],
    },
    {
        "title": "IBPS Clerk — Clerical Cadre in Public Sector Banks",
        "company": "Institute of Banking Personnel Selection",
        "category": "banking",
        "short_description": "Clerk posts across 11 public sector banks. ~6000 vacancies annually.",
        "description": (
            "The IBPS Clerk exam recruits Clerks (Customer Service Associates) for 11 public sector "
            "banks across India. Selection has two phases: Preliminary Exam (English, Numerical "
            "Ability, Reasoning) and Main Exam (Reasoning + Computer Aptitude, English, Quant, GA). "
            "No interview. Final selection is based purely on Mains marks. State-wise vacancies "
            "and language proficiency in the local state language is mandatory."
        ),
        "eligibility": "Bachelor's degree (any discipline). Age 20-28. Local language proficiency required.",
        "salary_text": "Rs 19900 - Rs 47920 (basic pay starting Rs 24050)",
        "vacancies": 6000,
        "location": "All India",
        "apply_url": "https://www.ibps.in/",
        "tags": ["ibps", "clerk", "banking", "graduate"],
    },
    {
        "title": "SBI PO — Probationary Officer in State Bank of India",
        "company": "State Bank of India",
        "category": "banking",
        "short_description": "Probationary Officer recruitment in India's largest public sector bank.",
        "description": (
            "The SBI PO exam is conducted annually by the State Bank of India to recruit "
            "Probationary Officers for its branches across India. SBI is India's largest public "
            "sector bank. Selection has three phases: Preliminary Exam, Main Exam (Objective + "
            "Descriptive), and Group Exercise + Interview. The PO undergoes 2 years of probation "
            "and is then confirmed as an Assistant Manager. Considered one of the most competitive "
            "banking exams."
        ),
        "eligibility": "Bachelor's degree (any discipline). Age 21-30.",
        "salary_text": "Rs 41960 - Rs 63840 (with allowances total ~Rs 65000-70000/month in metros)",
        "vacancies": 2000,
        "location": "All India",
        "apply_url": "https://sbi.co.in/web/careers",
        "tags": ["sbi", "po", "banking", "probationary-officer", "graduate"],
    },
    {
        "title": "SBI Clerk — Junior Associate in State Bank of India",
        "company": "State Bank of India",
        "category": "banking",
        "short_description": "Junior Associate (Customer Support & Sales) in SBI branches. ~8000+ vacancies.",
        "description": (
            "The SBI Clerk exam recruits Junior Associates (Customer Support & Sales) for SBI "
            "branches across India. Selection has two phases: Preliminary Exam and Main Exam. "
            "No interview. State-wise vacancies and proficiency in the local state language is "
            "mandatory. The Junior Associate handles cash, account opening, customer queries, "
            "and sales of bank products."
        ),
        "eligibility": "Bachelor's degree. Age 20-28. Local language proficiency.",
        "salary_text": "Rs 26730 - Rs 47920 (with allowances total ~Rs 35000/month)",
        "vacancies": 8000,
        "location": "All India",
        "apply_url": "https://sbi.co.in/web/careers",
        "tags": ["sbi", "clerk", "banking", "junior-associate", "graduate"],
    },
    {
        "title": "RBI Grade B Officer — Reserve Bank of India",
        "company": "Reserve Bank of India",
        "category": "banking",
        "short_description": "Officer-level recruitment in India's central bank. The most prestigious banking exam.",
        "description": (
            "The RBI Grade B exam recruits Officers in Grade B (General/DEPR/DSIM) for the Reserve "
            "Bank of India, India's central bank and monetary authority. This is considered the "
            "most prestigious banking exam in India. Selection has three phases: Phase 1 (Objective), "
            "Phase 2 (Objective + Descriptive papers on ESI, FM, English), and Interview. RBI "
            "officers play a key role in monetary policy, banking supervision, and currency management."
        ),
        "eligibility": "Bachelor's degree with 60% marks (50% for SC/ST/PwBD). Age 21-30.",
        "salary_text": "Rs 55200 - Rs 99750 (gross ~Rs 1.16 lakh/month including allowances)",
        "vacancies": 300,
        "location": "All India",
        "apply_url": "https://opportunities.rbi.org.in/",
        "tags": ["rbi", "grade-b", "banking", "officer", "central-bank", "graduate"],
    },
    # ───── Railway ─────
    {
        "title": "RRB NTPC — Non-Technical Popular Categories",
        "company": "Railway Recruitment Board",
        "category": "railway",
        "short_description": "Non-technical posts in Indian Railways: Station Master, Goods Guard, Clerk, Typist.",
        "description": (
            "The RRB NTPC exam recruits candidates for Non-Technical Popular Categories in Indian "
            "Railways including Station Master, Goods Guard, Senior Commercial cum Ticket Clerk, "
            "Commercial Apprentice, Junior Account Assistant cum Typist, Senior Time Keeper, and "
            "Traffic Assistant. Selection has CBT-1, CBT-2, Skill Test (where applicable), Document "
            "Verification, and Medical Examination. One of the largest railway recruitments."
        ),
        "eligibility": "12th pass (Undergraduate posts) or Graduate (Graduate posts). Age 18-33.",
        "salary_text": "Rs 19900 - Rs 35400 (varies by post)",
        "vacancies": 35000,
        "location": "All India",
        "apply_url": "https://www.rrbcdg.gov.in/",
        "tags": ["rrb", "ntpc", "railway", "station-master", "graduate", "12th-pass"],
    },
    {
        "title": "RRB Group D — Track Maintainer, Helper, Gateman",
        "company": "Railway Recruitment Board",
        "category": "railway",
        "short_description": "Group D posts in Indian Railways. 100000+ vacancies in each cycle.",
        "description": (
            "The RRB Group D exam recruits candidates for Level 1 posts in Indian Railways including "
            "Track Maintainer Grade IV, Helper/Assistant in various technical departments, Assistant "
            "Pointsman, and Gateman. Selection has CBT, Physical Efficiency Test (PET), Document "
            "Verification, and Medical Examination. The largest single recruitment drive in India "
            "by volume."
        ),
        "eligibility": "10th pass / ITI from a recognised institution. Age 18-33.",
        "salary_text": "Rs 18000 (Pay Level 1)",
        "vacancies": 100000,
        "location": "All India",
        "apply_url": "https://www.rrbcdg.gov.in/",
        "tags": ["rrb", "group-d", "railway", "10th-pass", "iti"],
    },
    {
        "title": "RRB ALP — Assistant Loco Pilot",
        "company": "Railway Recruitment Board",
        "category": "railway",
        "short_description": "Assistant Loco Pilot and Technician posts in Indian Railways.",
        "description": (
            "The RRB ALP exam recruits Assistant Loco Pilots and Technicians for Indian Railways. "
            "Selection has CBT-1, CBT-2 (with Aptitude Test for ALP), Document Verification, and "
            "Medical Examination. The Assistant Loco Pilot assists the Loco Pilot in running trains "
            "and is on the path to becoming a Loco Pilot after experience."
        ),
        "eligibility": "10th pass + ITI / Diploma in relevant trades. Age 18-30.",
        "salary_text": "Rs 19900 (Pay Level 2)",
        "vacancies": 5000,
        "location": "All India",
        "apply_url": "https://www.rrbcdg.gov.in/",
        "tags": ["rrb", "alp", "railway", "loco-pilot", "iti", "technician"],
    },
    # ───── PSU & Defense ─────
    {
        "title": "ISRO Scientist/Engineer — SC Recruitment",
        "company": "Indian Space Research Organisation",
        "category": "psu",
        "short_description": "Scientist/Engineer 'SC' posts at ISRO centres across India. BE/BTech recruitment.",
        "description": (
            "ISRO recruits Scientist/Engineer 'SC' (entry-level scientist) in Electronics, Mechanical, "
            "and Computer Science streams across its centres including Vikram Sarabhai Space Centre, "
            "Satish Dhawan Space Centre, ISRO Satellite Centre, and others. Selection is via written "
            "exam followed by interview. Working at ISRO is one of the most prestigious technical "
            "careers in India."
        ),
        "eligibility": "BE/BTech in Electronics/Mechanical/Computer Science with minimum 65%. Age up to 28.",
        "salary_text": "Rs 56100 - Rs 177500 (Pay Level 10)",
        "vacancies": 200,
        "location": "All India (multiple ISRO centres)",
        "apply_url": "https://www.isro.gov.in/Careers.html",
        "tags": ["isro", "psu", "scientist", "engineer", "btech", "central-govt"],
    },
    {
        "title": "DRDO Scientist 'B' — Defence Research Recruitment",
        "company": "Defence Research and Development Organisation",
        "category": "psu",
        "short_description": "Scientist 'B' entry-level posts at DRDO labs across India via RAC.",
        "description": (
            "The DRDO Recruitment and Assessment Centre (RAC) recruits Scientist 'B' (entry-level) "
            "for DRDO laboratories across India. The recruitment uses GATE scores in some streams "
            "and direct interview in others. DRDO scientists work on cutting-edge defence technology "
            "including missiles, aircraft, electronics, materials, and computer science."
        ),
        "eligibility": "BE/BTech with minimum 65%. Some posts require valid GATE score. Age up to 28.",
        "salary_text": "Rs 56100 - Rs 177500 (Pay Level 10)",
        "vacancies": 150,
        "location": "All India (multiple DRDO labs)",
        "apply_url": "https://rac.gov.in/",
        "tags": ["drdo", "psu", "scientist", "defense", "btech", "gate"],
    },
    {
        "title": "Indian Army Agniveer — Agnipath Scheme",
        "company": "Indian Army",
        "category": "defense",
        "short_description": "Soldier recruitment under the Agnipath Scheme. 4-year contract with retention option.",
        "description": (
            "The Indian Army Agniveer recruitment under the Agnipath Scheme enrolls young "
            "candidates as Agniveers for a 4-year service period. After 4 years, 25% of Agniveers "
            "are retained for a further 15-year service. Categories include General Duty, Technical, "
            "Clerk/Store Keeper, Tradesman, Nursing Assistant, and Soldier Pharma. Selection is via "
            "online CEE followed by Physical Fitness Test, Physical Measurement Test, and Medical "
            "Examination at the rally."
        ),
        "eligibility": "10th/12th pass (varies by category). Age 17.5-21. Indian male/female citizen.",
        "salary_text": "Rs 30000 - Rs 40000/month + Seva Nidhi corpus of Rs 11.71 lakh on completion",
        "vacancies": 40000,
        "location": "All India",
        "apply_url": "https://joinindianarmy.nic.in/",
        "tags": ["army", "agniveer", "defense", "soldier", "10th-pass", "12th-pass"],
    },
    {
        "title": "Indian Navy SSR / AA — Sailor Recruitment",
        "company": "Indian Navy",
        "category": "defense",
        "short_description": "Senior Secondary Recruit and Artificer Apprentice sailor posts in the Indian Navy.",
        "description": (
            "The Indian Navy recruits sailors via Senior Secondary Recruit (SSR) and Artificer "
            "Apprentice (AA) entries. Selection involves written exam, Physical Fitness Test, and "
            "Medical Examination. After selection, candidates undergo 24 weeks of basic training at "
            "INS Chilka. Sailors serve on ships, submarines, and shore establishments of the Indian "
            "Navy."
        ),
        "eligibility": "12th pass with Physics, Maths and one of Chemistry/Biology/Computer Science. Age 17-20.",
        "salary_text": "Stipend Rs 14600 during training, then sailor pay scale",
        "vacancies": 2500,
        "location": "All India",
        "apply_url": "https://www.joinindiannavy.gov.in/",
        "tags": ["navy", "ssr", "aa", "defense", "sailor", "12th-pass"],
    },
    {
        "title": "AFCAT — Air Force Common Admission Test",
        "company": "Indian Air Force",
        "category": "defense",
        "short_description": "Officer entry into Indian Air Force (Flying, Technical, Ground Duty branches).",
        "description": (
            "The AFCAT exam is conducted twice a year by the Indian Air Force to recruit officers "
            "in the Flying Branch (Permanent and Short Service Commission) and Ground Duty branches "
            "(Technical and Non-Technical). Selection is via written exam (AFCAT for all, EKT for "
            "Technical), AFSB Interview, and Medical Examination. Training is at the Air Force "
            "Academy, Dundigal."
        ),
        "eligibility": "Graduate (specific streams for Technical). Age 20-24 (Flying), 20-26 (Ground Duty).",
        "salary_text": "Officer pay scale (Flying Officer: ~Rs 85000/month gross)",
        "vacancies": 300,
        "location": "All India",
        "apply_url": "https://afcat.cdac.in/",
        "tags": ["afcat", "air-force", "defense", "officer", "graduate", "flying"],
    },
    # ───── Teaching ─────
    {
        "title": "CTET — Central Teacher Eligibility Test",
        "company": "Central Board of Secondary Education",
        "category": "teaching",
        "short_description": "Mandatory eligibility test for teaching in central government schools (KVS, NVS, etc.).",
        "description": (
            "The CTET is conducted by CBSE twice a year as a mandatory eligibility test for "
            "candidates aspiring to become teachers in classes I-VIII in central government schools "
            "including Kendriya Vidyalayas, Navodaya Vidyalayas, Central Tibetan Schools, and "
            "schools under the administrative control of the central government. Two papers: "
            "Paper I (Class I-V) and Paper II (Class VI-VIII). The certificate is valid for life."
        ),
        "eligibility": "Sr. Secondary + 2-year Diploma in Elementary Education / B.Ed. Age: no upper limit.",
        "salary_text": "Eligibility certificate only — actual recruitment via separate exams (KVS/NVS)",
        "vacancies": None,
        "location": "All India",
        "apply_url": "https://ctet.nic.in/",
        "tags": ["ctet", "teaching", "primary", "upper-primary", "kvs", "nvs"],
    },
    {
        "title": "KVS Teacher Recruitment — PRT, TGT, PGT",
        "company": "Kendriya Vidyalaya Sangathan",
        "category": "teaching",
        "short_description": "Primary Teacher (PRT), Trained Graduate Teacher (TGT), Post Graduate Teacher (PGT) in KVs.",
        "description": (
            "Kendriya Vidyalaya Sangathan recruits PRTs, TGTs, and PGTs for Kendriya Vidyalayas "
            "across India. Selection has Written Exam, Demo Teaching, and Interview. KV teachers "
            "enjoy central government pay scales, transfer benefits, and are considered among the "
            "most desirable teaching jobs in India."
        ),
        "eligibility": "Graduation/PG + B.Ed + CTET (for PRT/TGT). Age 30-40 (varies by post).",
        "salary_text": "Rs 35400 - Rs 142400 (PRT to PGT, Pay Level 6-8)",
        "vacancies": 12000,
        "location": "All India",
        "apply_url": "https://kvsangathan.nic.in/",
        "tags": ["kvs", "teaching", "prt", "tgt", "pgt", "central-govt"],
    },
    # ───── Insurance ─────
    {
        "title": "LIC AAO — Assistant Administrative Officer",
        "company": "Life Insurance Corporation of India",
        "category": "banking",
        "short_description": "AAO recruitment in LIC, India's largest insurance company. Officer-level pay.",
        "description": (
            "The LIC AAO exam recruits Assistant Administrative Officers in Generalist, IT, "
            "Chartered Accountant, Actuarial, Rajbhasha, and Legal cadres. Selection has Phase 1 "
            "(Preliminary), Phase 2 (Mains with Descriptive), and Interview. AAOs handle policy "
            "underwriting, claims processing, branch operations, and administration. LIC offers "
            "central-government-equivalent benefits with superior allowances."
        ),
        "eligibility": "Bachelor's degree with 55% marks (relaxation for reserved). Age 21-30.",
        "salary_text": "Rs 53600 (basic) — gross ~Rs 1 lakh/month with allowances",
        "vacancies": 700,
        "location": "All India",
        "apply_url": "https://licindia.in/web/guest/careers",
        "tags": ["lic", "aao", "insurance", "officer", "graduate"],
    },
    # ───── Police ─────
    {
        "title": "Delhi Police Constable Executive — Male & Female",
        "company": "Staff Selection Commission",
        "category": "police",
        "short_description": "Constable Executive recruitment in Delhi Police via SSC. ~7000 vacancies.",
        "description": (
            "The Delhi Police Constable Executive recruitment is conducted by SSC for both male "
            "and female candidates. Selection has CBT, Physical Endurance & Measurement Test (PE&MT), "
            "Document Verification, and Medical Examination. Constables serve in patrolling, law "
            "enforcement, traffic management, and investigation support roles."
        ),
        "eligibility": "12th pass (or equivalent). Age 18-25. LMV driving licence preferred.",
        "salary_text": "Rs 21700 - Rs 69100 (Pay Level 3)",
        "vacancies": 7000,
        "location": "Delhi",
        "apply_url": "https://ssc.nic.in/",
        "tags": ["delhi-police", "constable", "police", "ssc", "12th-pass"],
    },
    # ───── Postal ─────
    {
        "title": "India Post GDS — Gramin Dak Sevak",
        "company": "Department of Posts, India",
        "category": "govt-exam",
        "short_description": "Branch Postmaster, Assistant Branch Postmaster, Dak Sevak in rural post offices.",
        "description": (
            "The India Post GDS (Gramin Dak Sevak) recruitment fills the posts of Branch Postmaster "
            "(BPM), Assistant Branch Postmaster (ABPM), and Dak Sevak in rural post offices across "
            "India. Selection is purely based on 10th-class marks (no exam). The recruitment is "
            "circle-wise (state-wise) with thousands of vacancies in each circle. One of the easiest "
            "entry routes into a government job."
        ),
        "eligibility": "10th pass with Maths, English, and local language. Age 18-40.",
        "salary_text": "Rs 10000 - Rs 24470/month (TRCA)",
        "vacancies": 40000,
        "location": "All India (state-wise)",
        "apply_url": "https://indiapostgdsonline.gov.in/",
        "tags": ["india-post", "gds", "postal", "10th-pass", "rural"],
    },
]
