import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

interface ExamInfo {
  name: string;
  slug: string;
  color: string;
  description: string;
  longDescription: string;
  eligibility: string;
  pattern: string;
  dates: string;
  questionsAvailable: string;
  syllabus: string[];
}

const exams: Record<string, ExamInfo> = {
  upsc: {
    name: 'UPSC Civil Services',
    slug: 'upsc',
    color: 'bg-blue-500',
    description: 'India\'s premier civil services examination for IAS, IPS, IFS, and other Group A & B services.',
    longDescription: 'The Union Public Service Commission (UPSC) Civil Services Examination is one of the most prestigious and competitive exams in India. It selects candidates for the Indian Administrative Service (IAS), Indian Police Service (IPS), Indian Foreign Service (IFS), and other central services. The exam tests a wide range of subjects from current affairs to ethics.',
    eligibility: 'Indian citizen, age 21-32 (with relaxation for reserved categories), Bachelor\'s degree from a recognized university.',
    pattern: 'Three stages: Prelims (Objective MCQs), Mains (Descriptive), and Interview/Personality Test.',
    dates: 'Prelims: May/June, Mains: September/October, Interview: February-April (annual cycle).',
    questionsAvailable: '15,000+',
    syllabus: [
      'General Studies (History, Geography, Polity, Economy)',
      'Current Affairs & International Relations',
      'Science & Technology',
      'Environment & Ecology',
      'Ethics, Integrity & Aptitude',
      'CSAT (Aptitude & Comprehension)',
      'Optional Subject',
    ],
  },
  jee: {
    name: 'JEE (Main + Advanced)',
    slug: 'jee',
    color: 'bg-green-500',
    description: 'Joint Entrance Examination for admission to IITs, NITs, and top engineering colleges.',
    longDescription: 'The Joint Entrance Examination (JEE) is the gateway to India\'s top engineering institutions including IITs, NITs, IIITs, and other centrally funded technical institutions. JEE Main is the first stage, and top performers qualify for JEE Advanced, which determines admission to the Indian Institutes of Technology.',
    eligibility: 'Passed or appearing in Class 12 with Physics, Chemistry, and Mathematics. Age limit varies by category.',
    pattern: 'JEE Main: 90 MCQs & numerical (3 hours). JEE Advanced: 2 papers of 3 hours each with MCQ, numerical, and matching type.',
    dates: 'JEE Main: January & April sessions. JEE Advanced: May/June.',
    questionsAvailable: '12,000+',
    syllabus: [
      'Physics (Mechanics, Electrodynamics, Optics, Modern Physics)',
      'Chemistry (Physical, Organic, Inorganic)',
      'Mathematics (Algebra, Calculus, Coordinate Geometry)',
      'Trigonometry & Statistics',
      'Thermodynamics & Kinetics',
      'Vectors & 3D Geometry',
    ],
  },
  'ssc-cgl': {
    name: 'SSC CGL',
    slug: 'ssc-cgl',
    color: 'bg-purple-500',
    description: 'Staff Selection Commission Combined Graduate Level exam for Group B & C government posts.',
    longDescription: 'The SSC CGL (Combined Graduate Level) examination is conducted by the Staff Selection Commission for recruitment to various Group B and Group C posts in ministries, departments, and organizations of the Government of India. It is one of the most sought-after exams for graduates seeking government employment.',
    eligibility: 'Indian citizen, age 18-32 (varies by post), Bachelor\'s degree from a recognized university.',
    pattern: 'Four tiers: Tier I (Prelims, Online MCQ), Tier II (Mains, Online MCQ), Tier III (Descriptive), Tier IV (Skill Test/Computer Proficiency).',
    dates: 'Tier I: March-April, Tier II: June-July, Tier III: August (annual cycle, dates vary).',
    questionsAvailable: '10,000+',
    syllabus: [
      'Quantitative Aptitude',
      'English Language & Comprehension',
      'General Intelligence & Reasoning',
      'General Awareness (Static GK + Current Affairs)',
      'Statistics (for specific posts)',
      'Finance & Economics (for specific posts)',
    ],
  },
  banking: {
    name: 'Banking Exams',
    slug: 'banking',
    color: 'bg-orange-500',
    description: 'SBI PO, IBPS PO/Clerk, RBI Grade B, and other banking recruitment exams.',
    longDescription: 'Banking exams in India include SBI PO, IBPS PO, IBPS Clerk, RBI Grade B, and other competitive exams conducted for recruitment in public and private sector banks. These exams test aptitude, reasoning, English, general awareness, and computer knowledge, with a focus on financial and banking awareness.',
    eligibility: 'Indian citizen, age 20-30 (varies by exam and category), Bachelor\'s degree from a recognized university.',
    pattern: 'Typically Prelims (MCQ) + Mains (MCQ + Descriptive) + Interview. Pattern varies by specific exam (SBI PO, IBPS PO, etc.).',
    dates: 'SBI PO: April-May. IBPS PO: October-November. IBPS Clerk: December. RBI Grade B: February-March.',
    questionsAvailable: '13,000+',
    syllabus: [
      'Quantitative Aptitude & Data Interpretation',
      'Reasoning Ability & Puzzles',
      'English Language',
      'General/Financial Awareness',
      'Banking & Economy Current Affairs',
      'Computer Aptitude',
    ],
  },
  neet: {
    name: 'NEET',
    slug: 'neet',
    color: 'bg-pink-500',
    description: 'National Eligibility cum Entrance Test for MBBS, BDS, and AYUSH admissions.',
    longDescription: 'The National Eligibility cum Entrance Test (NEET) is the single entrance exam for admission to MBBS, BDS, AYUSH, and other medical courses across India. Conducted by NTA, NEET is taken by over 20 lakh students annually, making it one of the most competitive exams in the country. It tests Physics, Chemistry, and Biology at the Class 11-12 level.',
    eligibility: 'Passed or appearing in Class 12 with Physics, Chemistry, and Biology. Age: 17-25 years (relaxation for reserved categories).',
    pattern: '200 MCQs (180 to attempt) across Physics, Chemistry, Botany, and Zoology. 3 hours 20 minutes. Negative marking: -1 for wrong answer.',
    dates: 'Usually held in May. NTA announces dates in December/January.',
    questionsAvailable: '10,000+',
    syllabus: [
      'Physics (Mechanics, Thermodynamics, Optics, Modern Physics)',
      'Chemistry (Physical, Organic, Inorganic)',
      'Botany (Cell Biology, Plant Physiology, Ecology)',
      'Zoology (Human Physiology, Genetics, Evolution)',
      'Biotechnology & Reproduction',
    ],
  },
  'gate-cs': {
    name: 'GATE Computer Science',
    slug: 'gate-cs',
    color: 'bg-cyan-500',
    description: 'Graduate Aptitude Test in Engineering for M.Tech admissions and PSU recruitment.',
    longDescription: 'GATE (Graduate Aptitude Test in Engineering) is a national-level exam for admission to M.Tech/ME programs at IITs, IISc, NITs, and other top institutions. GATE scores are also used by PSUs like ISRO, BHEL, NTPC, and ONGC for recruitment. The CS/IT paper tests core Computer Science fundamentals including DSA, DBMS, OS, Networks, and Theory of Computation.',
    eligibility: 'Bachelor\'s degree in Engineering/Technology or Master\'s degree in relevant science. No age limit.',
    pattern: '65 questions (MCQ + Numerical), 100 marks, 3 hours. Includes General Aptitude (15 marks) and Technical (85 marks).',
    dates: 'Usually held in February. Registration opens in August/September.',
    questionsAvailable: '8,000+',
    syllabus: [
      'Data Structures & Algorithms',
      'Operating Systems',
      'Database Management Systems',
      'Computer Networks',
      'Theory of Computation & Compiler Design',
      'Digital Logic & Computer Organization',
      'Discrete Mathematics & Probability',
    ],
  },
  cat: {
    name: 'CAT',
    slug: 'cat',
    color: 'bg-amber-500',
    description: 'Common Admission Test for MBA admissions to IIMs and top business schools.',
    longDescription: 'The Common Admission Test (CAT) is conducted by one of the IIMs on a rotational basis for admission to MBA/PGDM programs at IIMs and 1,200+ other B-schools across India. CAT tests Verbal Ability, Data Interpretation, Logical Reasoning, and Quantitative Ability. Around 2.5 lakh candidates appear annually, with top IIMs accepting scores of 99+ percentile.',
    eligibility: 'Bachelor\'s degree with minimum 50% marks (45% for reserved categories). No age limit.',
    pattern: '66 questions across 3 sections: VARC (24), DILR (20), QA (22). 2 hours total with sectional time limit of 40 minutes each.',
    dates: 'Last Sunday of November. Registration opens in August.',
    questionsAvailable: '8,000+',
    syllabus: [
      'Verbal Ability & Reading Comprehension (VARC)',
      'Data Interpretation & Logical Reasoning (DILR)',
      'Quantitative Ability (Arithmetic, Algebra, Geometry)',
      'Para Jumbles & Sentence Completion',
      'Critical Reasoning',
    ],
  },
  coding: {
    name: 'Coding & Placements',
    slug: 'coding',
    color: 'bg-indigo-500',
    description: 'Data structures, algorithms, and programming for IT placements and interviews.',
    longDescription: 'Prepare for coding interviews and campus placements with LeetCode-style problems. Practice data structures (arrays, trees, graphs, heaps), algorithms (sorting, DP, greedy, backtracking), and programming concepts (OOP, recursion, bit manipulation). ExamPrep offers an in-browser code editor with test case execution, covering problems from easy to hard difficulty.',
    eligibility: 'Open to all. Ideal for BTech/MCA students preparing for campus placements or anyone preparing for coding interviews.',
    pattern: 'Practice problems with an in-browser code editor. Each problem has multiple test cases, starter code, and editorial solutions.',
    dates: 'Practice anytime. Campus placement season is typically August-February.',
    questionsAvailable: '500+',
    syllabus: [
      'Arrays, Strings & Hashing',
      'Linked Lists, Stacks & Queues',
      'Trees & Graphs',
      'Dynamic Programming',
      'Sorting & Searching',
      'Greedy Algorithms & Backtracking',
      'Object-Oriented Programming',
    ],
  },
};

export default function ExamDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const exam = slug ? exams[slug] : null;

  if (!exam) {
    return (
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exam Not Found</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            The exam you are looking for does not exist or is not yet available.
          </p>
          <Link to="/" className="btn-primary mt-8 inline-block px-6 py-3">
            Back to Home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <Helmet>
        <title>{exam.name} Preparation - ExamPrep | AI-Powered Practice</title>
        <meta name="description" content={`Prepare for ${exam.name} with AI-generated questions, mock tests, and adaptive learning. ${exam.questionsAvailable} questions available.`} />
        <meta property="og:title" content={`${exam.name} Preparation - ExamPrep | AI-Powered Practice`} />
        <meta property="og:description" content={`Prepare for ${exam.name} with AI-generated questions, mock tests, and adaptive learning. ${exam.questionsAvailable} questions available.`} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className={`mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${exam.color} text-2xl font-bold text-white`}>
              {exam.name.charAt(0)}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              {exam.name}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              {exam.description}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={`/try/${exam.slug}`} className="btn-primary px-8 py-3 text-base">
                Try 5 Questions Free
              </Link>
              <Link to="/register" className="btn-secondary px-6 py-3 text-base">
                Sign Up & Start
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About this exam */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              About {exam.name}
            </h2>
            <p className="mt-4 text-gray-600 leading-7 dark:text-gray-400">
              {exam.longDescription}
            </p>
          </div>
        </div>
      </section>

      {/* Key Facts */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
            Key Facts
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Eligibility', value: exam.eligibility, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              { label: 'Exam Pattern', value: exam.pattern, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { label: 'Important Dates', value: exam.dates, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { label: 'Questions Available', value: exam.questionsAvailable, icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((fact) => (
              <div key={fact.label} className="card">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={fact.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {fact.label}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Syllabus */}
      <section id="syllabus" className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
              Syllabus Overview
            </h2>
            <p className="mt-3 text-center text-gray-600 dark:text-gray-400">
              Topics covered in our {exam.name} question bank
            </p>
            <div className="mt-10 space-y-3">
              {exam.syllabus.map((topic, index) => (
                <div key={index} className="card flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Ready to Crack {exam.name}?
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Access {exam.questionsAvailable} practice questions with AI-powered explanations and adaptive difficulty.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-3 text-base font-semibold text-primary-600 shadow-sm transition-colors hover:bg-primary-50"
          >
            Start Practicing Free
          </Link>
        </div>
      </section>
    </>
  );
}
