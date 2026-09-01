-- Beach Kids ERO Self-Audit Portal
-- ERO CRITERIA SEED
-- Source: 'Self-Audit Checklists. Updated January 2022' — Education Review Office,
-- 'Self-Audit Checklists For Services Licensed under 2008 Regulatory Framework'.
--
-- Every official_requirement value below is transcribed verbatim from that document
-- (bullet points preserved with •, paragraph breaks preserved). Nothing has been
-- reworded, simplified, combined, or removed.
--
-- IMPORTANT — codes without an ERO-assigned number:
-- The source document numbers most criteria (‘Criterion C1’, ‘Criterion PF1’, ‘Criterion
-- HS1’, ‘Criterion GMA1’ …) but a handful of tickable items appear only under a plain
-- numbered heading with NO ‘Criterion’ label of their own (e.g. Curriculum section ‘ 5
-- Documentation’, ‘6 Curriculum Framework - The Principles’, ‘7 The Strands’; Premises &
-- Facilities ‘ 7 Facilities for persons with disabilities’, ‘ 8 Swimming pools’; and eight
-- headings in Governance, Management & Administration covering Immunisation, Privacy Act,
-- Human Rights, staff appointments/teacher registration, Police vetting, Fit and Proper
-- Persons, Teaching Council reporting, and Children’s Act 2014 safety checking).
-- For these items only, the CODE (C14–C16, PF39–PF40, GMA13–GMA20) is a Beach Kids-assigned
-- identifier continuing the section's numbering — used purely for navigation/routing in
-- this app — NOT an official ERO criterion number. The requirement TEXT itself is still
-- 100% verbatim from the source. source_reference notes this explicitly per row.

-- C1: Prescribed Curriculum Framework
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C1', 'Prescribed Curriculum Framework',
  'Is the service curriculum consistent with any prescribed curriculum framework that applies to the service?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.5, ''Criterion C1''',
  1
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C2: Assessment, Planning and Evaluation
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C2', 'Assessment, Planning and Evaluation',
  'Is the service curriculum informed by assessment, planning, and evaluation (documented and undocumented) that demonstrates an understanding of children’s learning, their interests, whānau, and life contexts?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.5, ''Criterion C2''',
  2
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C3: Positive, Reciprocal Relationships
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C3', 'Positive, Reciprocal Relationships',
  'Do adults providing education and care, engage in meaningful, positive interactions to enhance children’s learning and nurture reciprocal relationships?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.5, ''Criterion C3''',
  3
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C4: Knowledge of Children’s Learning and Development
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C4', 'Knowledge of Children’s Learning and Development',
  'Do the practices of adults providing education and care demonstrate an understanding of children’s learning and development, and knowledge of relevant theories and practice in early childhood education?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.5, ''Criterion C4''',
  4
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C5: Tangata Whenua and Te Tiriti o Waitangi
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C5', 'Tangata Whenua and Te Tiriti o Waitangi',
  'Does the service curriculum acknowledge and reflect the unique place of Māori as tangata whenua?

Are children given the opportunity to develop knowledge and an understanding of the cultural heritages of both parties to Te Tiriti o Waitangi?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.5, ''Criterion C5''',
  5
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C6: Culture and Identity
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C6', 'Culture and Identity',
  'Does the service curriculum respect and support the right of each child to be confident in their own culture and encourage children to understand and respect other cultures?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.5, ''Criterion C6''',
  6
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C7: Inclusive, Responsive Curriculum
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C7', 'Inclusive, Responsive Curriculum',
  'Is the service curriculum inclusive, and responsive to children as confident and competent learners?

Are children’s preferences respected, and are they involved in decisions about their learning experiences?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.6, ''Criterion C7''',
  7
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C8: Language-Rich Environment
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C8', 'Language-Rich Environment',
  'Does the service curriculum provide a language-rich environment that supports children’s learning?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.6, ''Criterion C8''',
  8
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C9: Range of Learning Experiences
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C9', 'Range of Learning Experiences',
  'Does the service curriculum provide children with a range of experiences and opportunities to enhance and extend their learning and development – both indoors and outdoors, individually and in groups?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.6, ''Criterion C9''',
  9
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C10: Social Competence and Positive Guidance
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C10', 'Social Competence and Positive Guidance',
  'Does the service curriculum support children’s developing social competence and understanding of appropriate behaviour?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.6, ''Criterion C10''',
  10
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C11: Parent and Whānau Aspirations
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C11', 'Parent and Whānau Aspirations',
  'Are positive steps taken to respect and acknowledge the aspirations held by parents and whānau for their children?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.6, ''Criterion C11''',
  11
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C12: Parent Communication and Involvement in Learning
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C12', 'Parent Communication and Involvement in Learning',
  'Are regular opportunities (formal and informal) provided for parents to:
• communicate with adults providing education and care about their child, and share specific evidence of the child’s learning; and
• be involved in decision-making concerning their child’s learning?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.6, ''Criterion C12''',
  12
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C13: Information and Guidance from Agencies
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C13', 'Information and Guidance from Agencies',
  'Is information and guidance sought when necessary from agencies/services to enable adults providing education and care to work effectively with children and their parents?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.6, ''Criterion C13''',
  13
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C14: Documentation of Compliance (C1–C13)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C14', 'Documentation of Compliance (C1–C13)',
  'Is there documentation that provides evidence of the service’s compliance with criteria C1 to C13?

Note: Documentation may take a variety of forms to suit the service’s operation (such as portfolios, wall displays, policies and procedures) but must include:
1. A process for providing positive guidance to encourage social competence in children (C10);
2. A process for providing formal and informal opportunities for parents to:
• communicate with adults providing education and care about their child, and share specific evidence of the child’s learning; and
• be involved in decision-making concerning their child’s learning (C12).
3. A record of information and guidance sought from agencies and/or services (C13).',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.6. No individual ERO criterion number in the source — code ''C14'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  14
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C15: Curriculum Framework — The Principles
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C15', 'Curriculum Framework — The Principles',
  'Has the service provider ensured that:
• The service’s curriculum empowers children to learn and grow?
• The service’s curriculum reflects the holistic way children learn and grow?
• The wider world of family and community is an integral part of early childhood curriculum?
• Children learn through responsive and reciprocal relationships with people, places and things?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.7. No individual ERO criterion number in the source — code ''C15'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  15
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- C16: Curriculum Framework — The Strands
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'C16', 'Curriculum Framework — The Strands',
  'The health and well-being of the child are protected and nurtured?
• Children and their families feel a sense of belonging?
• Opportunities for learning are equitable and each child’s contribution is valued?
• The languages and symbols of children’s own and other cultures are promoted and protected?
• The child learns through active exploration of the environment?',
  'ERO Self-Audit Checklists (Jan 2022), Section 1 – Curriculum standard, p.7. No individual ERO criterion number in the source — code ''C16'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  16
from ero_sections where code = 'C'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF1: Design and Layout — Range of Experiences
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF1', 'Design and Layout — Range of Experiences',
  'Does the design and layout of the premises:
• Support the provision of different types of indoor and outdoor experiences; and
• Include quiet spaces, areas for physically active play, and space for a range of individual and group learning experiences appropriate to the number, ages, and abilities of children attending?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.9, ''Criterion PF1''',
  1
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF2: Design and Layout — Supervision
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF2', 'Design and Layout — Supervision',
  'Does the design and layout of the premises support effective adult supervision so that children’s access to the licensed space (indoor and outdoor) is not unnecessarily limited?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.9, ''Criterion PF2''',
  2
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF3: Building Act and Bylaw Compliance
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF3', 'Building Act and Bylaw Compliance',
  'Do the premises conform to any relevant bylaws of the local authority and the Building Act 2004?

Documentation:
1. Code Compliance Certificate issued under section 95 of the Building Act 2004 for any building work undertaken, or alternatively any other documentation that shows evidence of compliance.
2. Current Annual Building Warrant of Fitness (if the premises require a compliance schedule under section 100 of the Building Act 2004).',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.9, ''Criterion PF3''',
  3
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF4: Sufficient Furniture, Equipment and Materials
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF4', 'Sufficient Furniture, Equipment and Materials',
  'Are sufficient quantity of (indoor and outdoor) furniture, equipment, and materials provided that are appropriate for the learning and abilities of the children attending?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.9, ''Criterion PF4''',
  4
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF5: Safe and Suitable Furniture and Equipment
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF5', 'Safe and Suitable Furniture and Equipment',
  'Are all indoor and outdoor items and surfaces, furniture, equipment and materials safe and suitable for their intended use?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.9, ''Criterion PF5''',
  5
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF6: Floor Surfaces
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF6', 'Floor Surfaces',
  'Are floor surfaces durable, safe, and suitable for the range of activities to be carried out at the service (including wet and messy play), and can they easily be kept clean?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.10, ''Criterion PF6''',
  6
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF7: Glass Safety
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF7', 'Glass Safety',
  'Are any windows or other areas of glass accessible to children either:
• made of safety glass; or
• covered by an adhesive film designed to hold the glass in place in the event of it being broken; or
• effectively guarded by barriers which prevent a child striking or falling against the glass?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.10, ''Criterion PF7''',
  7
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF8: Storage of Equipment and Materials
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF8', 'Storage of Equipment and Materials',
  'Are there sufficient spaces for equipment and material to be stored safely?

Can stored equipment and materials be easily accessed by adults, and where practicable, by children?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.10, ''Criterion PF8''',
  8
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF9: Adult Work Spaces
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF9', 'Adult Work Spaces',
  'Is there space for adults working at the service to:
• use for planned breaks;
• meet privately with parents and colleagues;
• store curriculum support materials; and
• assess, plan, and evaluate?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.10, ''Criterion PF9''',
  9
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF10: Art and Paint Facilities
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF10', 'Art and Paint Facilities',
  'Are there facilities (other than those required for PF26) or alternative arrangements available for the preparation and cleaning of paint and other art materials?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.10, ''Criterion PF10''',
  10
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF11: Telephone
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF11', 'Telephone',
  'Is there a telephone on which calls can be made to and from the service?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.10, ''Criterion PF11''',
  11
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF12: Lighting, Ventilation, Temperature and Noise
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF12', 'Lighting, Ventilation, Temperature and Noise',
  'Do parts of the building or buildings used by children have:
• lighting (natural or artificial) that is appropriate to the activities offered or purpose of each room;
• ventilation (natural or mechanical) that allows fresh air to circulate (particularly in sanitary and sleep areas);
• a safe and effective means of maintaining a room temperature of no lower than 18 degrees C; and
• acoustic absorption materials if necessary to reduce noise levels that may negatively affect children’s learning or wellbeing?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.10, ''Criterion PF12''',
  12
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF13: Outdoor Activity Space
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF13', 'Outdoor Activity Space',
  'Is outdoor activity space:
• connected to the indoor activity space and can be easily and safely accessed by children;
• safe, well-drained, and suitably surfaced for a variety of activities;
• enclosed by structures and/or fences and gates designed to ensure that children are not able to leave the premises without the knowledge of adults providing education and care;
• not unduly restricted by Resource Consent conditions with regards to its use by the service to provide for outdoor experiences; and
• available for the exclusive use of the service during hours of operation?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.11, ''Criterion PF13''',
  13
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF14: Space for Non-Mobile Infants (Under 2)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF14', 'Space for Non-Mobile Infants (Under 2)',
  'Are there safe and comfortable (indoor and outdoor) spaces for infants, toddlers or children not walking to lie, roll, creep, crawl, pull themselves up, learn to walk, and to be protected from more mobile children?

[Applies only to services licensed for under 2 year olds]',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.11, ''Criterion PF14''',
  14
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF15: Eating Space
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF15', 'Eating Space',
  'Is there a safe and hygienic place for children attending to sit when eating?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.11, ''Criterion PF15''',
  15
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF16: Food Preparation and Storage Facilities
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF16', 'Food Preparation and Storage Facilities',
  'Are there facilities for the hygienic preparation, storage and/or serving of food and drink that contain:
• a means of keeping perishable food at a temperature at or below 4 degrees C and protected from vermin and insects;
• a means of cooking and/or heating food;
• a means of hygienically washing dishes;
• a sink connected to a hot water supply;
• storage; and
• food preparation surfaces that are impervious to moisture and can be easily maintained in a hygienic condition?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.11, ''Criterion PF16''',
  16
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF17: Kitchen and Cooking Facility Safety
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF17', 'Kitchen and Cooking Facility Safety',
  'Are kitchen and cooking facilities or appliances designed, located, or fitted with safety devices to ensure that children cannot access them without assistance or supervision?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.12, ''Criterion PF17''',
  17
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF18: Number of Toilets
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF18', 'Number of Toilets',
  'Is there at least 1 toilet for every 1-15 persons? (Persons are defined as children aged two and older and teaching staff that count towards the required adult:child ratio.)',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.12, ''Criterion PF18''',
  18
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF19: Handwashing Taps
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF19', 'Handwashing Taps',
  'Is there at least 1 tap delivering warm water (over an individual’s or shared hand basin) for every 15 persons (or part thereof) at the service (that is to say, children attending and adults counting towards the required adult:child ratio)?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.12, ''Criterion PF19''',
  19
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF20: Toilet and Handwashing Facility Design
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF20', 'Toilet and Handwashing Facility Design',
  'Are toilet and associated handwashing/drying facilities intended for use by children:
• designed and located to allow children capable of independent toileting to access them safely without adult help; and
• adequately separated from areas of the service used for play or food preparation to prevent the spread of infection?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.12, ''Criterion PF20''',
  20
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF21: Hand-Drying
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF21', 'Hand-Drying',
  'Is there a means of drying hands for children and adults that prevents the spread of infection?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.12, ''Criterion PF21''',
  21
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF22: Toilet Privacy
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF22', 'Toilet Privacy',
  'Is at least one of the toilets for use by children designed to provide them with a sense of privacy?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.12, ''Criterion PF22''',
  22
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF23: Adult Toilet
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF23', 'Adult Toilet',
  'Is there a toilet suitable for adults to use?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.12, ''Criterion PF23''',
  23
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF24: Tempering Valve
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF24', 'Tempering Valve',
  'Is a tempering valve or other accurate means of limiting hot water temperature installed for the requirements of criterion HS13 to be met?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.12, ''Criterion PF24''',
  24
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF25: Nappy Changing Facilities
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF25', 'Nappy Changing Facilities',
  'Are there safe and stable nappy changing facilities that can be kept hygienically clean?

Are these facilities located in a designated area near to handwashing facilities, and adequately separated from areas of the service used for play or food preparation to prevent the spread of infection?

Do the design, construction, and location of the facilities ensure that:
• they are safe and appropriate for the age/weight and number of children needing to use them;
• children’s independence can be fostered as appropriate;
• children’s dignity and right to privacy is respected; and
• some visibility from another area of the service is possible?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.13, ''Criterion PF25''',
  25
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF26: Washing Sick or Soiled Children — Facilities
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF26', 'Washing Sick or Soiled Children — Facilities',
  'Are there suitable facilities for washing sick or soiled children; and

a procedure outlining how hygiene and infection control outcomes will be met when washing sick and soiled children?

Documentation:
A procedure outlining how the service will ensure hygiene and infection control outcomes are met when washing sick or soiled children.',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.13, ''Criterion PF26''',
  26
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF27: Space for a Sick Child
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF27', 'Space for a Sick Child',
  'Is there space (away from where food is stored, prepared, or eaten) where a sick child can:
• be temporarily kept at a safe distance from other children (to prevent cross-infection);
• lie down comfortably; and
• be supervised?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.13, ''Criterion PF27''',
  27
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF28: First Aid Kit
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF28', 'First Aid Kit',
  'Is there a first aid kit that:
• complies with the requirements of Appendix 1 of the Licensing Criteria for Early Childhood Education and Care Centres 2008; and
• is easily recognisable and readily accessible to adults; and
• is inaccessible to children?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.13, ''Criterion PF28''',
  28
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF29: Safe Sleep Furniture
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF29', 'Safe Sleep Furniture',
  'Are furniture and items intended for children to sleep on (such as cots, beds, stretchers, or mattresses) of a size that allows children using them to lie flat, and are of a design to ensure their safety?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.14, ''Criterion PF29''',
  29
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF30: Non-Porous Sleep Surfaces
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF30', 'Non-Porous Sleep Surfaces',
  'Are furniture and items intended for children to sleep on (such as cots, beds, stretchers, or mattresses) that will be used by more than one child over time securely covered with or made of a non-porous material (that is, a material that does not allow liquid to pass through it) that:
• protects them becoming soiled;
• allows for easy cleaning (or is disposable); and
• does not present a suffocation hazard to children?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.14, ''Criterion PF30''',
  30
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF31: Individual Bedding
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF31', 'Individual Bedding',
  'Are clean individual bedding (such as blankets, sheets, sleeping bags, and pillowslips) provided for sleeping or resting children that is sufficient to keep them warm?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.14, ''Criterion PF31''',
  31
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF32: Sleep/Rest Space — Sessional Services (Over 2s)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF32', 'Sleep/Rest Space — Sessional Services (Over 2s)',
  'SESSIONAL SERVICES ONLY:
Is a safe and comfortable place to sleep (such as a bed, stretcher, mattress, or couch) available for children aged two and older that require sleep or rest during a session?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.14, ''Criterion PF32''',
  32
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF33: Sleep/Rest Space — All-Day Services (Over 2s)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF33', 'Sleep/Rest Space — All-Day Services (Over 2s)',
  'ALL-DAY SERVICES ONLY:
Is space available for children aged two and older to sleep or rest for a reasonable period of time each day?

If space used for sleeping or resting is part of the activity space, are there alternative spaces for children not sleeping or resting as necessary?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.14, ''Criterion PF33''',
  33
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF34: Sleep Furniture — All-Day Services (Over 2s)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF34', 'Sleep Furniture — All-Day Services (Over 2s)',
  'ALL-DAY SERVICES ONLY:
Are furniture or items intended for children to sleep on (such as cots, beds, stretchers, or mattresses) available for the sleep or rest of children aged two and older?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.14, ''Criterion PF34''',
  34
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF35: Sleep Space — Sessional Services (Under 2s)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF35', 'Sleep Space — Sessional Services (Under 2s)',
  'SESSIONAL SERVICES ONLY:
Is a designated space available to support the provision of a restful sleep for children under the age of two at any time they are attending?

Is this space located and designed to:
• minimise fluctuations in temperature, noise and lighting levels;
• allow adequate supervision; and
• accommodate at least the requirements of criterion PF36, when arranged in accordance with criterion HS10?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.14, ''Criterion PF35''',
  35
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF36: Sleep Furniture Ratio — Sessional Services (Under 2s)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF36', 'Sleep Furniture Ratio — Sessional Services (Under 2s)',
  'SESSIONAL SERVICES ONLY:
Are furniture or items intended for children to sleep on (such as cots, stretchers, or mattresses) provided at a ratio of at least one to every 5 children under the age of two?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.15, ''Criterion PF36''',
  36
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF37: Sleep Space — All-Day Services (Under 2s)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF37', 'Sleep Space — All-Day Services (Under 2s)',
  'ALL-DAY SERVICES ONLY:
Is a designated space available to support the provision of restful sleep for children under the age of two at any time they are attending?

Is this space located and designed to:
• minimise fluctuations in temperature, noise and lighting levels;
• allow adequate supervision; visibility from another area of the service; and
• accommodate at least the requirements of Criterion PF38, when arranged in accordance with Criterion HS10?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.15, ''Criterion PF37''',
  37
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF38: Sleep Furniture Ratio — All-Day Services (Under 2s)
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF38', 'Sleep Furniture Ratio — All-Day Services (Under 2s)',
  'ALL-DAY SERVICES ONLY:
Are furniture and items intended for children to sleep on (such as cots, beds, stretchers, or mattresses) provided at a ratio of at least one to every 2 children under the age of two?',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.15, ''Criterion PF38''',
  38
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF39: Access for Persons with Disabilities
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF39', 'Access for Persons with Disabilities',
  'Are there access and facilities for persons with disabilities to and within the centre’s building?
[This is the building owner’s responsibility].',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.15. No individual ERO criterion number in the source — code ''PF39'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  39
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- PF40: Swimming Pool Requirements
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'PF40', 'Swimming Pool Requirements',
  'If any swimming pool structure exists, does it meet the criteria listed in the NZS 5826:2010 ‘Pool water quality’ (Standards NZ website) and NZS 8500:2006 ‘Safety barriers and fences around swimming pools’ (Standards NZ website)?

[Write N/A if not applicable]',
  'ERO Self-Audit Checklists (Jan 2022), Section 2 – Premises and facilities standard, p.15. No individual ERO criterion number in the source — code ''PF40'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  40
from ero_sections where code = 'PF'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS1: Premises and Equipment Hygiene
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS1', 'Premises and Equipment Hygiene',
  'Are the premises, furniture, fittings, equipment, and materials kept safe and hygienic and maintained in good condition?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.17, ''Criterion HS1''',
  1
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS2: Laundering of Linen
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS2', 'Laundering of Linen',
  'Is linen used by children or adults hygienically laundered?

Documentation:
A procedure for the hygienic laundering (off-site or on-site) of linen used by the children or adults.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.17, ''Criterion HS2''',
  2
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS3: Nappy Changing Procedure
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS3', 'Nappy Changing Procedure',
  'Is there a procedure for the changing (and disposal, if appropriate) of nappies displayed near the nappy changing facilities and consistently implemented?

Documentation:
A procedure for the changing (and disposal, if appropriate) of nappies. The procedure aims to ensure:
• safe and hygienic practices; and
• that children are treated with dignity and respect.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.17, ''Criterion HS3''',
  3
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS4: Fire Evacuation Scheme
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS4', 'Fire Evacuation Scheme',
  'Are the premises located in a building that has a current Fire Evacuation Scheme that is approved by the New Zealand Fire Service?

Documentation:
A current Fire Evacuation Scheme approved by the New Zealand Fire Service.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.17, ''Criterion HS4''',
  4
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS5: Assembly Areas
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS5', 'Assembly Areas',
  'Are there designated assembly areas for evacuation purposes outside the building to keep children safe from further risk?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.17, ''Criterion HS5''',
  5
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS6: Securing Heavy Furniture and Equipment
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS6', 'Securing Heavy Furniture and Equipment',
  'Are heavy furniture, fixtures, and equipment that could fall or topple and cause serious injury or damage secured?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.18, ''Criterion HS6''',
  6
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS7: Emergency Planning
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS7', 'Emergency Planning',
  'Is there a written emergency plan and supplies to ensure the care and safety of the children and adults at the service?

Does the plan include evacuation procedures for the service’s premises, which apply in a variety of emergency situations and which are consistent with the Fire Evacuation Scheme for the building?

Documentation:
A written emergency plan that includes at least:
• An evacuation procedure for the premises.
• A list of safety and emergency supplies and resources sufficient for the age and number of children and adults at the service and details of how these will be maintained and accessed in an emergency.
• Details of the roles and responsibilities that will apply during an emergency situation.
• A communication plan for families and support services.
• Evidence of review of the plan on an, at least, annual basis and implementation of improved practices as required.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.18, ''Criterion HS7''',
  7
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS8: Emergency Drills
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS8', 'Emergency Drills',
  'Are adults providing education and care familiar with relevant emergency drills and carry these out with the children on an at least three-monthly basis?

Documentation:
A record of emergency drills carried out and evidence of how evaluation of the drills has informed the annual review of the service’s emergency plan.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.18, ''Criterion HS8''',
  8
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS9: Sleep Monitoring Procedure
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS9', 'Sleep Monitoring Procedure',
  'Is a procedure for monitoring children’s sleep displayed and implemented and a record of children’s sleep times kept?

Documentation:
1. A procedure for monitoring children’s sleep. The procedure ensures that children:
• do not have access to food or liquids while in bed; and
• are checked for warmth, breathing, and general well-being at least every 5–10 minutes, or more frequently according to individual needs?
2. A record of the time each child attending the service sleeps, and checks made by adults during that time.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.18, ''Criterion HS9''',
  9
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS10: Sleep Furniture Arrangement
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS10', 'Sleep Furniture Arrangement',
  'Are furniture or items intended for children to sleep on (such as cots, beds, stretchers, or mattresses) arranged and spaced when in use so that:
• adults have clear access to at least one side (meaning the length, not the width);
• the area surrounding each child allows air movement to minimise the risk of spreading illness; and
• children able to sit or stand can do so safely as they wake?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.15, ''Criterion HS10''',
  10
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS11: Storage of Sleep Furniture and Bedding
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS11', 'Storage of Sleep Furniture and Bedding',
  'If not permanently set up, is furniture or items intended for children to sleep on (such as cots, beds, stretchers, or mattresses) and bedding hygienically stored when not in use?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.19, ''Criterion HS11''',
  11
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS12: Daily Hazard Checks and Risk Management
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS12', 'Daily Hazard Checks and Risk Management',
  'Are the equipment, premises and facilities checked every day of operation for hazards to the children?

Are accident/incident records analysed to identify hazards and appropriate action is then taken?

Are hazards to the safety of children eliminated, isolated, or minimised?

Consideration of hazards must include but are not limited to:
• cleaning agents, medicines, poisons, and other hazardous materials;
• electrical sockets and appliances (particularly heaters);
• hazards present in kitchen or laundry facilities;
• vandalism, dangerous objects, and foreign materials (e.g. broken glass, animal droppings);
• the condition and placement of learning, play and other equipment;
• windows and other areas of glass;
• poisonous plants; and
• bodies of water.

Documentation:
A documented risk management system.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.19, ''Criterion HS12''',
  12
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS13: Warm Water Temperature
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS13', 'Warm Water Temperature',
  'Is the temperature of warm water delivered from taps that are accessible to children no higher than 40 degrees C, and comfortable for children at the centre to use?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.20, ''Criterion HS13''',
  13
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS14: Hot Water Cylinder Temperature
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS14', 'Hot Water Cylinder Temperature',
  'Is water stored in any hot water cylinder kept at a temperature of at least 60 degrees C?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.20, ''Criterion HS14''',
  14
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS15: Noise Levels
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS15', 'Noise Levels',
  'Are all practicable steps taken to ensure that noise levels do not unduly interfere with normal speech and/or communication, or cause any child attending distress or harm?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.20, ''Criterion HS15''',
  15
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS16: Animal Handling
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS16', 'Animal Handling',
  'Are safe and hygienic handling practices implemented with regard to any animals at the service?

Are all animals able to be restrained?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.20, ''Criterion HS16''',
  16
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS17: Excursions — Ratios, Risk and Approval
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS17', 'Excursions — Ratios, Risk and Approval',
  'When Children leave the premises on an excursion:
• Is assessment and management of the risks undertaken, and
• are adult:child ratios determined accordingly?
• Are ratios not less than the required adult:child ratio?
• Are the first aid requirements in criterion HS25 met in relation to those children and any children remaining at the premises?
• Have parents/caregivers given prior written approval of their child’s participation and of the proposed ratio for:
  i. regular excursions at the time of enrolment; and
  ii. special excursions prior to the outing or excursion taking place; and
  iii. are there communication systems in place so that people know where the children are, and adults communicate with others as necessary?

When children leave the premises on a regular or special excursion, is the excursion approved by the Person Responsible?

Documentation:
A record of excursions that includes:
• the names of adults and children involved;
• the time and date of the excursion;
• the location and method of travel;
• assessment and management of risk;
• adult:child ratios;
• evidence of parental permission and approval of adult:child ratios for regular excursions;
• evidence of parental permission and approval of adult:child ratios for special excursions and
• the signature of the Person Responsible for giving approval for the excursion to take place.

‘Person Responsible’ is the person(s) nominated for the purpose by the service provider; being persons who are directly involved in, and primarily responsible for, the day-to-day education and care, comfort, and health and safety of the children.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.20, ''Criterion HS17''',
  17
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS18: Motor Vehicle Travel
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS18', 'Motor Vehicle Travel',
  'If children travel in a motor vehicle while in the care of the service:
• is each child restrained as required by Land Transport legislation?
• are the required adult:child ratios maintained, and
• is the written permission of a parent of the child obtained before the travel begins (unless the child is travelling with their parent)?

Documentation:
Evidence of parental permission for any travel by motor vehicle. In most cases, this requirement will be met by the excursion records required for criterion HS17. Services that provide transport for children to and/or from the service must also gain written permission from a parent upon enrolment.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.21, ''Criterion HS18''',
  18
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS19: Food — Timing, Variety and Healthy Eating
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS19', 'Food — Timing, Variety and Healthy Eating',
  'Is food served at appropriate times to meet nutritional needs of each child while they are attending?

Where food is provided by the service, is it of sufficient variety, quantity, and quality to meet the nutritional and developmental needs of each child?

Where food is provided by the parents, does the service encourage and promote healthy eating guidelines?

Documentation:
A record of all food served during the service’s hours of operation (other than that provided by parents for their own children). Records show the type of food provided, and are available for inspection for 3 months after the food is served.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.21, ''Criterion HS19''',
  19
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS20: Hygienic Food Preparation
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS20', 'Hygienic Food Preparation',
  'Is food prepared, served, and stored hygienically?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.22, ''Criterion HS20''',
  20
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS21: Drinking Water
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS21', 'Drinking Water',
  'Is an ample supply of water that is fit to drink available for children at all times, and are older children able to access this water independently?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.22, ''Criterion HS21''',
  21
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS22: Supervision While Eating and Choking Prevention
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS22', 'Supervision While Eating and Choking Prevention',
  'Are children supervised and seated while eating?

• Where food is provided by the service, foods that pose a high choking risk are not to be served unless prepared in accordance with best practice as set out in Ministry of Health: Reducing food-related choking for babies and young children at early learning services.

Where food is provided by parents, the service promotes best practices as set out in Ministry of Health: Reducing food-related choking for babies and young children at early learning services and must provide to all parents at the time of enrolment a copy of Ministry of Health: Reducing food-related choking for babies and young children at early learning services.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.22, ''Criterion HS22''',
  22
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS23: Feeding Infants Under 12 Months
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS23', 'Feeding Infants Under 12 Months',
  'APPLIES ONLY TO SERVICES LICENSED FOR UNDER 2 YEAR OLDS:
Are infants under the age of 6 months and other children unable to drink independently held semi-upright when being fed?

Is any infant food given to a child under the age of 12 months of a type approved by the child’s parent?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.22, ''Criterion HS23''',
  23
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS24: Room Temperature
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS24', 'Room Temperature',
  'Are rooms used by children kept at a comfortable temperature no lower than 18 degrees C (at 500mm above the floor) while children are attending?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.22, ''Criterion HS24''',
  24
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS25: First Aid Coverage
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS25', 'First Aid Coverage',
  'Is an adult present at all times for every 25 children attending (or part thereof) who:
• holds a current First Aid qualification gained from a New Zealand Qualifications Authority accredited first aid training provider; or
• is a registered medical practitioner or nurse with a current practising certificate?; or
• is a qualified ambulance officer or paramedic?
(Note: applies from 8 April 2021)

If a child is injured, is any required first aid administered or supervised by an adult meeting these requirements?

Documentation:
Copies of current first aid (or medical practising) certificates for adults counting towards this requirement.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.22, ''Criterion HS25''',
  25
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS26: Preventing Spread of Infectious Disease
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS26', 'Preventing Spread of Infectious Disease',
  'Are all practicable steps taken to ensure that children do not come into contact with any person (adult or child) on the premises who is suffering from a disease or condition likely to have a detrimental effect on them?

Specifically:
• Is the action specified in Appendix 2 of the Licensing Criteria for Early Childhood Education and Care Centres 2008 taken for any person (adult or child) suffering from particular infectious diseases?
• Are children who become unwell while attending the service kept at a safe distance from other children (to minimise the spread of infection) and returned to the care of a parent or other person authorised to collect the child without delay?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.23, ''Criterion HS26''',
  26
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS27: Serious Injury or Illness Response
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS27', 'Serious Injury or Illness Response',
  'Are all practicable steps taken to get immediate medical assistance for a child who is seriously injured or becomes seriously ill, and to notify a parent of what has happened?

Documentation:
1. A record of serious injuries, illnesses and incidents that occur at the service. Records include:
• the child’s name;
• the date, time, and description of the injury, illness or incident;
• actions taken and by whom; and
• evidence that the parents have been notified/informed.
2. A procedure outlining the service’s response to injury, illness, and incident, including the review and implementation of practices as required.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.23, ''Criterion HS27''',
  27
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS28: Administering Medicine
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS28', 'Administering Medicine',
  'Medicine (prescription and non-prescription) is not given to a child unless it is given:
• by a doctor or ambulance personnel in an emergency; or
• by the parent of the child; or
• with the written authority (appropriate to the category of medicine) of a parent.

Medicines are stored safely and appropriately, and are disposed of or sent home with a parent (if supplied in relation to a specific child) after the specified time.

Documentation:
1. A record of the written authority from parents for the administration of medicine in accordance with the requirement for the category of medicine outlined in Appendix 3.
2. A record of all medicine (prescription and non-prescription) given to children attending the service. Records include:
• name of the child;
• name and amount of medicine given;
• date and time medicine was administered and by whom; and
• evidence of parental acknowledgement.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.24, ''Criterion HS28''',
  28
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS29: Medicine Administration Training
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS29', 'Medicine Administration Training',
  'Are adults who administer medicine to children (other than their own) provided with information and/or training relevant to the task?

Documentation:
A record of training and/or information provided to adults who administer medicine to children (other than their own) while at the service.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.24, ''Criterion HS29''',
  29
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS30: Washing Sick or Soiled Children
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS30', 'Washing Sick or Soiled Children',
  'Are children washed when they are soiled or pose a health risk to themselves or others?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.24, ''Criterion HS30''',
  30
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS31: Child Protection Policy
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS31', 'Child Protection Policy',
  '1. Is there a written child protection policy that meets the requirements of the Children’s Act 2014?
2. Does the policy contain provisions on the identification and reporting of child abuse and neglect, and information about how the service will keep children safe from abuse and neglect, and information about how the service will respond to suspected child abuse and neglect?
3. Will the policy be reviewed every three years?

Documentation:
1. The written child protection policy contains:
a. provisions for the service’s identification and reporting of child abuse and neglect;
b. information about practices the service employs to keep children safe from abuse and neglect; and
c. information about how the service will respond to suspected child abuse and neglect.
2. A procedure that sets out how the service will identify and respond to suspected child abuse and/or neglect.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.24, ''Criterion HS31''',
  31
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS32: Protection from Inappropriate Material
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS32', 'Protection from Inappropriate Material',
  'Are all practicable steps taken to protect children from exposure to inappropriate material (for example, of an explicitly sexual or violent nature)?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.25, ''Criterion HS32''',
  32
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS33: Alcohol and Substance Use on Premises
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS33', 'Alcohol and Substance Use on Premises',
  'Has the service provider ensured that no person on the premises uses, or is under the influence of, alcohol or any other substance that has a detrimental effect on their functioning or behaviour during the service’s hours of operation?',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.25, ''Criterion HS33''',
  33
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- HS34: Serious Incident Notification
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'HS34', 'Serious Incident Notification',
  '• Has the service notified a specified agency where there is a serious injury or illness or incident involving a child while at the service? And
• Has the service also notified the Ministry of Education at the same time?

[Note: specified agency is defined to include the NZ Police; Ministry of Health; Oranga Tamariki; Worksafe NZ, and the Teaching Council. Please tick N/A if no serious injury/incident had occurred]

Documentation:
A copy of the notification sent to the specified agency.',
  'ERO Self-Audit Checklists (Jan 2022), Section 3 – Health and safety practices standard, p.25, ''Criterion HS34''',
  34
from ero_sections where code = 'HS'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA1: Information Displayed for Parents
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA1', 'Information Displayed for Parents',
  'Are the following prominently displayed at the service for parents and visitors:
the Education (Early Childhood Services) Regulations 2008, and the Licensing Criteria for Early Childhood and Care Centres 2008?
the full names and qualifications of each person counting towards regulated qualification requirements?
the service’s current licence certificate?
a procedure people should follow if they wish to complain about non-compliance with Regulations or criteria?

Documentation:
A procedure people should follow if they wish to complain about non-compliance with the Regulations or criteria. The procedure includes the option to contact the local MOE office and provides contact details.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.28, ''Criterion GMA1''',
  1
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA2: Parent Access to Information
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA2', 'Parent Access to Information',
  'Are parents advised how to access:
• information concerning their child?
• the service’s operational documents (such as its philosophy, policies, and procedures and any other documents that set out how day to day operations will be conducted)?
• the most recent ERO report regarding the service?

Documentation:
Written information letting parents know how to access:
• information concerning their child;
• the service’s operational documents; and
• the most recent ERO report regarding the service.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.28, ''Criterion GMA2''',
  2
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA3: Parent Information — Involvement, Fees and Funding
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA3', 'Parent Information — Involvement, Fees and Funding',
  'Is information provided to parents about:
• how they can be involved in the service;
• any fees charged by the services;
• the amount and details of the expenditure of any Ministry of Education funding received by the service; and
• any planned reviews and consultation?

Documentation:
Written information letting parents know:
• how they can be involved in the service;
• any fees charged by the service;
• the amount and details of the expenditure of any Ministry of Education funding received by the service; and
• about any planned reviews and consultation.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.29, ''Criterion GMA3''',
  3
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA4: Parent and Staff Input into Policy
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA4', 'Parent and Staff Input into Policy',
  'Are parents of children attending the service, and adults providing education and care, provided with opportunities to contribute to the development and review of the service’s operational documents (such as philosophy, policies, and procedures any other documents that set out how day to day operations will be conducted)?

Documents:
Evidence of opportunities provided for parents and adults providing education and care to contribute to the development and review of the service’s operational documents.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.29, ''Criterion GMA4''',
  4
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA5: Philosophy Statement
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA5', 'Philosophy Statement',
  'Is there a philosophy statement that guides the service’s operation?

Documentation:
A written statement expressing the service’s beliefs, values, and attitudes about the provision of early childhood education and care.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.29, ''Criterion GMA5''',
  5
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA6: Self-Review Process
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA6', 'Self-Review Process',
  'Is there an ongoing process of self-review to help the service maintain and improve the quality of its education and care.

Documentation:
1. A process of reviewing and evaluating the service’s operation (for example, learning and teaching practices, philosophy, policies, and procedures) by the people involved in the service. The process is consistent with criterion GMA4/GMA3, and includes a schedule showing timelines for planned review of different areas of operation.
2. Recorded outcomes from the review process. Outcomes show how the service has regard for the Statement of National Education and Learning Priorities (NELP) in its operation.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.29, ''Criterion GMA6''',
  6
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA7: Human Resource Management
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA7', 'Human Resource Management',
  'Are suitable human resource management practices implemented?

Documentation:
Processes for human resource management; including:
• selection and appointment procedures;
• job/role descriptions;
• induction procedures into the service;
• a system of regular appraisal;
• provision for professional development;
• a definition of serious misconduct; and
• discipline/dismissal procedures.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.30, ''Criterion GMA7''',
  7
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA7A: Children’s Worker Safety Checking
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA7A', 'Children’s Worker Safety Checking',
  'Are all children’s workers who have access to children safety checked in accordance with the Children’s Act 2014 [CA]?
• Are the safety checks undertaken and the results obtained before the worker has access to children?
• Are the results of the safety checks recorded and the record kept as long as the person is employed at the service?
• Are safety checks of every children’s worker carried out every three years? [Safety checks may be carried out by the employer or another person or organisation acting on the employer’s behalf]
[Refer to MOE Guidance on the components of the safety check, and periodic rechecking]

Documentation:
1. a written procedure for safety checking all children’s workers before they have access to children that meets the safety checking requirements of the CA
2. a record of all safety checks and the results.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.30, ''Criterion GMA7A''',
  8
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA8: Annual Plan
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA8', 'Annual Plan',
  'Is there an annual plan to guide the service’s operation?

Documentation:
An annual plan identifying ‘who’, ‘what’, and ‘when’ in relation to key tasks undertaken each year, and how key tasks will have regard to the Statement of National Education and Learning Priorities (NELP).',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.31, ''Criterion GMA8''',
  9
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA9: Annual Budget
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA9', 'Annual Budget',
  'Is there an annual budget to guide financial expenditure?

Documentation:
An annual budget setting out the service’s estimated revenue and expenses for the year. The budget includes at least:
• staffing costs, including leave entitlements;
• professional development costs;
• equipment and material costs for the ongoing purchase of new equipment and consumable materials; and
• provision for operational costs (such as electricity, telephone, food purchases, and other day to day items) and maintenance of the premises as appropriate.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.31, ''Criterion GMA9''',
  10
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA10: Enrolment Records
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA10', 'Enrolment Records',
  'Are enrolment records maintained for each child attending?

Are records kept for at least 7 years?

Documentation:
Enrolment records for each child currently attending and for those who have attended in the previous 7 years. Records meet the requirements of the Early Childhood Education Funding Handbook and include at least:
• the child’s full name, date of birth, and address;
• the name and address of at least 1 parent;
• details of how at least 1 parent (or someone nominated by them) can be contacted while the child attends the service;
• the name of the medical practitioner (or medical centre) who should, if practicable, be consulted if the child is ill or injured;
• details of any chronic illness/condition that the child has, and of any implications or actions to be followed in relation to that illness/condition;
• the names of the people authorised by the parent to collect the child; and
• any court orders affecting day to day care of, or contact with, the child.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.31, ''Criterion GMA10''',
  11
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA11: Attendance Records
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA11', 'Attendance Records',
  'Is an attendance record maintained that shows the times and dates of every child’s attendance at the service?

Are records kept for at least 7 years?

Documentation:
An attendance record that meets the requirements outlined in the Early Childhood Education Funding Handbook for children currently attending, and children who have attended in the previous 7 years.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.32, ''Criterion GMA11''',
  12
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA12: Documentation Available to Parents and Officials
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA12', 'Documentation Available to Parents and Officials',
  'Is required documentation made available as appropriate to parents and government officials having right of entry to the service under sections 27 and 622 of the Education and Training Act 2020?

[Note: refer to www.legislation.govt.nz for free access to the Education and Training Act 2020]',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.32, ''Criterion GMA12''',
  13
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA13: Immunisation Policies and Procedures
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA13', 'Immunisation Policies and Procedures',
  'Are there policies or procedures in place to ensure the requirements of the Health (Immunisation) Regulations 1995 are met?

[Refer to Immunisation Guidelines for Early Childhood Services]',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.32. No individual ERO criterion number in the source — code ''GMA13'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  14
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA14: Privacy Act Compliance
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA14', 'Privacy Act Compliance',
  'Are there policies and procedures in place to ensure the requirements of the Privacy Act 2020 are met in relation to information about children and the parents/caregivers of those children who attend the service; and

Are these policies/procedures regularly reviewed and implemented appropriately?

[Note: this Act applies from 1 December 2020]',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.32. No individual ERO criterion number in the source — code ''GMA14'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  15
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA15: Human Rights Act Compliance
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA15', 'Human Rights Act Compliance',
  'Are there policies/procedures to ensure compliance with the Human Rights Act 1993, and

Are these policies/procedures regularly reviewed and implemented appropriately?',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.32. No individual ERO criterion number in the source — code ''GMA15'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  16
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA16: Staff Appointments and Teacher Registration Review
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA16', 'Staff Appointments and Teacher Registration Review',
  'Has the service provider as employer regularly reviewed the following at least once a year, and appropriately implemented:
• the staff appointment process?
• the staff professional development programme, and outcomes?
• the EEO programme? [good practice]

For Kindergartens only:
• teacher registration – including practising certificates and LATs?
• the provisionally registered teachers’ induction programme?

For all other licensed services:
• teacher registration for the ‘person responsible’ in the service?
• The induction programme for any ‘person responsible’ who is provisionally registered?',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.33. No individual ERO criterion number in the source — code ''GMA16'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  17
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA17: Police Vetting
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA17', 'Police Vetting',
  'Has the service provider obtained a Police vet for every person:
a) whom the service provider appoints or intends to appoint to a position at the early childhood service; and
b) who is to work at the service during normal opening hours; and
c) who is not a registered teacher or holder of a limited authority to teach [LAT]?

Has the service provider obtained a Police vet of every contractor, or employee of a contractor who has, or is likely to have unsupervised access to children at the service during normal opening hours?

Has the service provider ensured that the Police vet is obtained before every person/contractor or their employee noted above has, or is likely to have unsupervised access to students at the service during normal opening hours?

Has the service provider obtained a Police vet every three years of every person/contractor or their employee noted above who still works at the service?

References: s 25 E&T Act 2020, Clauses 1, 2, 3, and 8 Schedule 4 Education and Training Act 2020.

Note: Nothing in the provisions above limits or affects Part 3 of the Children’s Act 2014 in relation to the safety checking of children’s workers [refer clause 14 of Schedule 4 E&T Act 2020].',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.33. No individual ERO criterion number in the source — code ''GMA17'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  18
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA18: Fit and Proper Person — Change of Circumstances
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA18', 'Fit and Proper Person — Change of Circumstances',
  'Has the service management advised the Secretary for Education of any change of his/her circumstances of the kind referred to in the statutory declaration made under Regulation 7?

[Ref: Regulation 7 and 35 of the Education (Early Childhood Services) Regulations 2008]

Note: Write N/A if not applicable.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.34. No individual ERO criterion number in the source — code ''GMA18'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  19
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA19: Mandatory Reporting to the Teaching Council
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA19', 'Mandatory Reporting to the Teaching Council',
  'In the following situations, has the service provider, as the employer, reported to the Teaching Council in compliance with the mandatory requirements under the Education and Training Act 2020: [Write N/A if not applicable]

i. When a teacher has been dismissed for any reason (section 489)?
ii. If, within 12 months before a teacher’s resignation or expiry of the teacher’s fixed-term contract, the employer has advised the teacher that it was dissatisfied with, or intended to investigate, any aspect of the conduct of the teacher or the teacher’s competence (section 489)?
iii. If, within 12 months after a teacher has left, the employer has received a complaint about the teacher’s conduct or competence while he/she was an employee (section 490)?
iv. If the employer has reason to believe that a teacher has engaged in serious misconduct (section 491)?
v. If the employer is satisfied that, despite undertaking competency procedures with a teacher, the teacher has not reached the required level of competence (section 492)?',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.34. No individual ERO criterion number in the source — code ''GMA19'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  20
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;

-- GMA20: Children’s Act 2014 — Safety Checking of Workforce
insert into ero_criteria (section_id, code, title, official_requirement, source_reference, sort_order)
select id, 'GMA20', 'Children’s Act 2014 — Safety Checking of Workforce',
  'For persons that the service provider proposes to employ or engage as a paid children’s worker, the following checks have been undertaken:

Identity Confirmation, either by:
a) using an electronic identity credential to check that the identity is not claimed by someone else; or
b) checking an original primary identity document (eg NZ passport); and a secondary identity document (eg NZ driver licence);

Note: if there are no photos of the person in the documents in (b), the service provider must require an identity referee to authenticate/verify identity of the staff. If the person’s name is different on a document in (b) the board must require a supporting name change document from the person.

c) searching the service provider’s personnel records to check whether the identity is being used or has been used by any person currently or previously employed/engaged by the service provider after having sighted the documents in (a) or (b) including the matters under ‘Note’ above.

Criminal Convictions
d) obtaining and considering information from NZ Police vet [Note: no need for Police vet if the person already had one in the last three years or person is a registered teacher]

Other Information
e) obtaining and considering a chronological summary of work history for preceding five years from the person; and
f) whether person is registered with the Teaching Council, and if so, service management has confirmed this with the Teaching Council;
g) obtaining and considering information from at least one referee (not related to the person or part of the extended family) and
h) any other information the board considers relevant for risk assessment;
i) interviewed the person, in person or by telephone or other communication technology;

[Note: the requirements in (e), (g), (h) and (i) do not apply if the person is currently employed or engaged by the board in another role – write N/A in this case]

Risk Assessment
j) evaluation of all the information above to assess the risk the potential children’s worker would pose to the safety of children if employed or engaged, taking into account whether the role is a core children’s worker or non-core children’s worker.

Note:
i. Children’s workers who are core workers work alone with or have primary responsibility or authority over children, eg educators, coordinators and person responsible. Also applies to persons undertaking unpaid children’s work as part of educational or vocational training course.
ii. The above checks now apply to core workers and non-core workers.
iii. The purpose of paragraph (c) is to establish that the proposed worker is the sole claimant of the identity.
iv. For details the service provider should refer to the relevant provisions of the Children’s Act 2014, and regulations 5–8 of the Children’s (Requirements for Safety Checks of Children’s Workers) Regulations 2015.
v. For more information visit www.childrensactionplan.govt.nz and ‘Children’s worker safety checking under the Children’s Act 2014’.
vi. Seek independent advice if you are uncertain.
vii. Keep accurate records about each aspect of the safety checking process.',
  'ERO Self-Audit Checklists (Jan 2022), Section 4 – Governance, Management and Administration standard, p.35. No individual ERO criterion number in the source — code ''GMA20'' is a Beach Kids navigation identifier only; requirement text is verbatim.',
  21
from ero_sections where code = 'GMA'
on conflict (code) do update set
  title = excluded.title,
  official_requirement = excluded.official_requirement,
  source_reference = excluded.source_reference,
  sort_order = excluded.sort_order;
