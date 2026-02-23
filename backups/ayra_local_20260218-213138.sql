--
-- PostgreSQL database dump
--

\restrict zOOoIRsXferXjQftg81hbLUXxuTssseyuLg6LXfjt855A4L05yr0HwWJi0RYrrl

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ArbitrationOutcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArbitrationOutcome" AS ENUM (
    'RELEASE',
    'REFUND',
    'SPLIT'
);


--
-- Name: DisputeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DisputeStatus" AS ENUM (
    'OPEN',
    'ARBITRATED',
    'CLOSED'
);


--
-- Name: DraftStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DraftStatus" AS ENUM (
    'SUBMITTED',
    'REVIEWED',
    'APPROVED',
    'REJECTED'
);


--
-- Name: EnquiryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EnquiryStatus" AS ENUM (
    'SUBMITTED',
    'QUOTED',
    'APPROVED',
    'REJECTED',
    'PROJECT_CREATED'
);


--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'UNREAD',
    'READ'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentType" AS ENUM (
    'DEPOSIT',
    'BALANCE',
    'RELEASE',
    'REFUND',
    'SPLIT'
);


--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'DRAFT',
    'FUNDED',
    'IN_PROGRESS',
    'DRAFT_SUBMITTED',
    'APPROVED',
    'DISPUTED',
    'RESOLVED',
    'RELEASED',
    'REFUNDED',
    'CANCELLED'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'CLIENT',
    'DESIGNER',
    'ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AdminInvite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminInvite" (
    id text NOT NULL,
    email text NOT NULL,
    "tokenHash" text NOT NULL,
    "invitedById" text NOT NULL,
    "acceptedUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "acceptedAt" timestamp(3) without time zone,
    role public."UserRole" DEFAULT 'ADMIN'::public."UserRole" NOT NULL
);


--
-- Name: ChainEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChainEvent" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "eventName" text NOT NULL,
    "txHash" text NOT NULL,
    "blockNumber" integer,
    payload jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Dispute; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Dispute" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "openedById" text NOT NULL,
    status public."DisputeStatus" DEFAULT 'OPEN'::public."DisputeStatus" NOT NULL,
    description text NOT NULL,
    decision public."ArbitrationOutcome",
    "decisionNote" text,
    "decidedById" text,
    "clientPercent" integer,
    "companyPercent" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DisputeFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DisputeFile" (
    id text NOT NULL,
    "disputeId" text NOT NULL,
    "uploadedById" text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    sha256 text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Draft; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Draft" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "uploadedById" text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    sha256 text NOT NULL,
    cid text,
    status public."DraftStatus" DEFAULT 'SUBMITTED'::public."DraftStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Enquiry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Enquiry" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    status public."EnquiryStatus" DEFAULT 'SUBMITTED'::public."EnquiryStatus" NOT NULL,
    "fullName" text NOT NULL,
    "contactEmail" text NOT NULL,
    "contactPhone" text NOT NULL,
    "serviceType" text,
    "addressLine" text,
    "propertyType" text,
    "propertySize" text,
    state text,
    area text,
    "budgetRange" text,
    "preferredStyle" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EnquiryFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EnquiryFile" (
    id text NOT NULL,
    "enquiryId" text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    sha256 text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MfaCode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MfaCode" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "codeHash" text NOT NULL,
    purpose text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    status public."NotificationStatus" DEFAULT 'UNREAD'::public."NotificationStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "readAt" timestamp(3) without time zone
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    type public."PaymentType" NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    amount numeric(65,30) NOT NULL,
    "txHash" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    "enquiryId" text,
    "clientId" text NOT NULL,
    "designerId" text,
    "adminId" text,
    title text NOT NULL,
    "quotedAmount" numeric(65,30) NOT NULL,
    "depositAmount" numeric(65,30) NOT NULL,
    "balanceAmount" numeric(65,30) NOT NULL,
    status public."ProjectStatus" DEFAULT 'DRAFT'::public."ProjectStatus" NOT NULL,
    "escrowAddress" text,
    "chainId" integer,
    "reviewDueAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "escrowPaused" boolean DEFAULT false NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TimelineEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimelineEvent" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "actorId" text,
    "eventType" text NOT NULL,
    message text NOT NULL,
    "txHash" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."UserRole" NOT NULL,
    "mfaEnabled" boolean DEFAULT false NOT NULL,
    "mfaSecret" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "walletAddress" text,
    "walletPrivateKey" text,
    "emailVerified" boolean DEFAULT true NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AdminInvite; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AdminInvite" (id, email, "tokenHash", "invitedById", "acceptedUserId", "createdAt", "expiresAt", "acceptedAt", role) FROM stdin;
cmlcg1qis000b3y3p1e6inli5	syafiqmajid286+invite1770476586948@gmail.com	70ccc41cb7c0f2d5fd5d937d320f4ec8d972ceb8adbff2c40095ed3b05dd2070	seed_admin	\N	2026-02-07 15:03:08.164	2026-02-14 15:03:08.162	\N	ADMIN
cmlcg2oxq000d3y3pupbaquwf	syafiqmajid286+invite1770476632496@gmail.com	ef6cd5c140534ffd3b9090a3c7afd4adae5846b1b80460d6838f1963d0f93941	seed_admin	cmlcg47j1000e3y3pdt712931	2026-02-07 15:03:52.767	2026-02-14 15:03:52.764	2026-02-07 15:05:03.661	ADMIN
cmlcg7j1k00013yfd4vtixcky	syafiqmajid286+invite1770476856983@gmail.com	a209b7c4df00048909ed5690b7598d0324ca2a618a654a05cb5d51a22d517d94	seed_admin	cmlcg8hvf00023yfd5qptvefp	2026-02-07 15:07:38.408	2026-02-14 15:07:38.406	2026-02-07 15:08:23.656	ADMIN
cmldj2mfj00063ykcbqiz33gs	security_invite_1770542134527@example.com	1ceb19b848d48bd0eff9ca1ead2dce46f018da5a16c69a682b593f17222c4e10	seed_admin	\N	2026-02-08 09:15:34.543	2026-02-15 09:15:34.54	\N	DESIGNER
\.


--
-- Data for Name: ChainEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ChainEvent" (id, "projectId", "eventName", "txHash", "blockNumber", payload, "createdAt") FROM stdin;
seed_chain_1	seed_project_1	DepositFunded	0x1a4c9e7b3f6d2c8a1f9e7b6c5d4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a	\N	{"amount": "6000"}	2026-01-22 11:53:32.519
seed_chain_2	seed_project_1	BalanceFunded	0x4b2a1f0e9d8c7b6a5f4e3d2c1b0a9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f	\N	{"amount": "6000"}	2026-01-22 11:53:32.519
seed_chain_3	seed_project_1	FundsReleased	0x8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e	\N	\N	2026-01-22 11:53:32.519
cml7lgd21000c3ywkerji8jlb	cml7fr97u00013y3m1hajj6h0	DepositFunded	0x5deaf3f931f444abe8ac25305a7f586bd899c48f792bce30c6a908b759b93099	\N	{"mode": "FIAT", "amount": "555.5", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-DEPOSIT-8ca82b17-d4c4-4c55-acec-12937301b20a", "bankUsername": "admin@ayra.local"}	2026-02-04 05:35:37.754
cml7ozbzz000f3yii6vc82kdh	cml7oo53a00033yiifa13qgyo	DepositFunded	0x6152cf38d85f0fcc110e6b351ef44c6caa50c149b5e262ea861135f5384382bc	\N	{"mode": "FIAT", "amount": "1250", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-DEPOSIT-89898bc1-93d6-4a14-941d-875e0982c1e5", "bankUsername": "admin@ayra.local"}	2026-02-04 07:14:21.695
cml94vv30001o3y0ly5hb85wo	cml7oo53a00033yiifa13qgyo	BalanceFunded	0xfd6373919d7ed6e739631826a73f4c64ac874ccf1a632183781dc0b54fc530f9	\N	{"mode": "FIAT", "amount": "1250", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-BALANCE-9bd6c26b-6eb3-4509-a0f2-70947072dd43", "bankUsername": "admin@ayra.local"}	2026-02-05 07:27:19.836
cml94wjj6001z3y0lgc1vnbbt	cml7oo53a00033yiifa13qgyo	FundsReleased	0xa12df60c8420f918882e49db7c04088765ccce807f483c459f661bd7c120dc25	\N	\N	2026-02-05 07:27:51.522
cml9li2ug000s3yivsrnijgeq	cml9lgucu000i3yiv4kc42f4j	DepositFunded	0x70a8766c9deab1e24b591fe4bbfbbcccd17d611b650ac8e0a4358f6e600c6820	\N	{"mode": "FIAT", "amount": "1250", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-DEPOSIT-ae87d689-ba01-4308-a4e8-25437c82d74f", "bankUsername": "admin@ayra.local"}	2026-02-05 15:12:30.184
cml9lo04x00193yivlm5jhdsz	cml9lgucu000i3yiv4kc42f4j	BalanceFunded	0x97acb58b15a9f0f6177d0831d13387dcd12842b144e979d131daa0e8fb42195f	\N	{"mode": "FIAT", "amount": "1250", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-BALANCE-ef718da8-d8ae-4543-9696-dd43fd613768", "bankUsername": "admin@ayra.local"}	2026-02-05 15:17:06.609
cml9lpco2001j3yivix1lvim9	cml9lgucu000i3yiv4kc42f4j	FundsReleased	0x59dd151858d0fa5c65b5a03e35f210982958df939ef871c7ee1c97a8e56e7bb0	\N	\N	2026-02-05 15:18:09.506
\.


--
-- Data for Name: Dispute; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Dispute" (id, "projectId", "openedById", status, description, decision, "decisionNote", "decidedById", "clientPercent", "companyPercent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DisputeFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DisputeFile" (id, "disputeId", "uploadedById", "fileName", "fileUrl", sha256, "createdAt") FROM stdin;
\.


--
-- Data for Name: Draft; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Draft" (id, "projectId", "uploadedById", "fileName", "fileUrl", sha256, cid, status, "createdAt") FROM stdin;
seed_draft_1	seed_project_1	seed_designer	Ayra-Concept-Board.txt	/uploads/drafts/seed-draft.txt	d01e30c7cd99f384c82cd7531c25f75feb2ef2e489c7d74d6a2460764e465312	\N	APPROVED	2026-01-22 11:53:32.519
cml7qf5cr00163yiiv3263cm6	cml7oo53a00033yiifa13qgyo	seed_designer	sample-draft.txt	/uploads/drafts/1770191679193_sample-draft.txt	4e6f3c2a5a2c278bdf7c92e051a9fdbe47abbcdaea42ada5f248a20dddc21e98	\N	SUBMITTED	2026-02-04 07:54:39.196
cml9ljb0y00103yiva1pjgvzt	cml9lgucu000i3yiv4kc42f4j	seed_designer	sample-draft.txt	/uploads/drafts/1770304407441_sample-draft.txt	4e6f3c2a5a2c278bdf7c92e051a9fdbe47abbcdaea42ada5f248a20dddc21e98	\N	SUBMITTED	2026-02-05 15:13:27.442
\.


--
-- Data for Name: Enquiry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Enquiry" (id, "clientId", status, "fullName", "contactEmail", "contactPhone", "serviceType", "addressLine", "propertyType", "propertySize", state, area, "budgetRange", "preferredStyle", notes, "createdAt", "updatedAt") FROM stdin;
seed_enquiry_1	seed_client	PROJECT_CREATED	Chris Client	client@ayra.local	012-3456789	Interior renovation	12 Jalan Example	Condominium	1,200 sqft	Selangor	Petaling Jaya	RM 60k - 80k	Modern warm	Looking to refresh the living room and kitchen layout.	2026-01-22 11:53:32.513	2026-01-22 11:53:32.513
cml2i061600053yluynpndehm	seed_client	PROJECT_CREATED	test	syafinion@gmail.com	0172347851	3D Design	test	Condominium	1200	Kuala Lumpur	ampang	\N	\N	\N	2026-01-31 16:00:12.427	2026-02-04 02:56:08.319
cml7nun9t00053ypxmdatyxad	seed_client	PROJECT_CREATED	test	test@gmail.com	0178294084	3D Design	28 New york city	Condominium	1200	Kuala Lumpur	Los Angeles	\N	\N	\N	2026-02-04 06:42:43.41	2026-02-04 07:05:39.545
cml925y5r00013ynzp1ukeebt	seed_designer	SUBMITTED	test	test@gmail.com	0171307841	2D Design	test	Landed House	1200	Selangor	test	\N	\N	\N	2026-02-05 06:11:11.535	2026-02-05 06:11:11.535
cml92fg4r00073ynzyvsjmb7w	seed_designer	SUBMITTED	test	test@gmail.com	01293455	2D Design	test	Landed House	1200	Selangor	test	\N	\N	\N	2026-02-05 06:18:34.731	2026-02-05 06:18:34.731
cml92qfef00013yhqxoebxl4e	seed_designer	SUBMITTED	test	test@gmail.com	01189044567	2D Design	test	Landed House	1200	Selangor	test	\N	\N	\N	2026-02-05 06:27:06.999	2026-02-05 06:27:06.999
cml9lfg8d00093yiv6f9rcabc	seed_client	PROJECT_CREATED	test	test@gmail.com	01780404576	Renovation	test	Landed House	1200	Sarawak	test	50k - 100k	Minimalist	test	2026-02-05 15:10:27.566	2026-02-05 15:11:32.54
cmll28fvh00083y4xb4z08n0j	cmll1yygq00023y4xuxg51nqk	SUBMITTED	natasya	yasminnatasya29@gmail.com	0192837464	3D Design	Villa Kiaramas	Landed House	10000	Kuala Lumpur	Sri Hartamas	50k - 100k	Luxury	\N	2026-02-13 15:46:21.918	2026-02-13 15:46:21.918
\.


--
-- Data for Name: EnquiryFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EnquiryFile" (id, "enquiryId", "fileName", "fileUrl", sha256, "createdAt") FROM stdin;
\.


--
-- Data for Name: MfaCode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MfaCode" (id, "userId", "codeHash", purpose, "expiresAt", "usedAt", "createdAt") FROM stdin;
cml2i10ha000c3ylu6o2kmffa	seed_admin	4fd6e9febfe1060cb1b1d299a0b983ec73e55bf718bd93367349951696045a08	create_project	2026-01-31 16:10:51.886	\N	2026-01-31 16:00:51.887
cml7om5ye00013yiiro2e0cum	seed_admin	8182bdc666fa59ee163d0bb4c59d87a8e14e1d2250392d0ee2574bb04b908334	create_project	2026-02-04 07:14:07.334	\N	2026-02-04 07:04:07.335
cml9lgchj000g3yiv8vd74kgt	seed_admin	f51195893710c76b0ff574b58b487f2eda654534773b7f2b65cda0feb4fda8b1	create_project	2026-02-05 15:21:09.367	\N	2026-02-05 15:11:09.368
cmlcbf24s00053ypq4ciac9wq	cmlcbf21y00033ypqxwqyuecg	d09c38ffd185e8d6389393471f2f3da312ba4ba25562a490306081c987c2b3a5	client_register_verify	2026-02-07 13:03:31.659	\N	2026-02-07 12:53:31.66
cmlcbf4uy00013yt3nz444a6m	cmlcbf21y00033ypqxwqyuecg	bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a	client_register_verify	2026-02-07 13:03:35.193	2026-02-07 12:53:35.228	2026-02-07 12:53:35.195
cmlcbka8500023yxjjpduydu7	cmlcbka5500003yxj3suwct3h	3bf0f0ec9bc3289ccf43ae76d7aa5b806931860c687d16621c260bb69bfd06dc	client_register_verify	2026-02-07 13:07:35.428	2026-02-07 12:57:58.252	2026-02-07 12:57:35.429
cmlcfw6sm00023y3p638ni4kd	cmlcfw6pg00003y3pq1vexzml	ba38ca4cca0943ae3065436b8db24cb647e37e6748612dad6b02a631ac960dfc	client_register_verify	2026-02-07 15:08:49.318	\N	2026-02-07 14:58:49.319
cmlcfyrau00043y3puucrh2bs	cmlcfw6pg00003y3pq1vexzml	01a34d187730dac4a671507e290e301bafbe6f074dcd131e45eeb307121dffba	client_register_verify	2026-02-07 15:10:49.206	\N	2026-02-07 15:00:49.207
cmlcg0f2m00073y3phcxhrq5z	cmlcg0f0300053y3px0hitt94	524123993221ec8c2c56dc91a12c72d88db908bc877426b25d476effdad87c33	client_register_verify	2026-02-07 15:12:06.67	2026-02-07 15:02:14.426	2026-02-07 15:02:06.67
cmldj1f6o00023ykccrw37q6k	cmldj1f3i00003ykcbdds7pf1	39c134c0df182dc2834037d5376a60c5b2e08e72c24fdc62736021e630c6f15f	client_register_verify	2026-02-08 09:24:38.496	\N	2026-02-08 09:14:38.496
cmlkiyllc00023y61wl8ove7l	cmlkiylhh00003y61nobv7xcx	4e95f1474d94c55cc72cd90e1e23c66c153398c97f80bc1c407f8420564348ec	client_register_verify	2026-02-13 06:56:50.063	\N	2026-02-13 06:46:50.064
cmll1yyk100043y4x91pzrqio	cmll1yygq00023y4xuxg51nqk	2943fac83a687859157eccde050eaa5255e2a13806ee0161e8d955d9a8590ff9	client_register_verify	2026-02-13 15:48:59.568	2026-02-13 15:39:24.332	2026-02-13 15:38:59.569
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "userId", title, message, status, "createdAt", "readAt") FROM stdin;
seed_notification_2	seed_client	Draft approved	Your draft was approved and the balance payment is on record.	READ	2026-01-22 11:53:32.53	2026-01-22 11:53:32.529
cmky168js00043yg8ywm71at0	seed_admin	New enquiry submitted	John Doe submitted a Design & Build enquiry.	UNREAD	2026-01-28 12:57:57.448	\N
cmll28fvn00093y4xe18knh1l	seed_admin	New enquiry submitted	natasya submitted a 3D Design enquiry.	UNREAD	2026-02-13 15:46:21.923	\N
cmky4y85100023y5v52du48e1	seed_admin	New enquiry submitted	Test Project submitted a Design & Build enquiry.	UNREAD	2026-01-28 14:43:42.133	\N
cmll28fvn000a3y4xmghzm1ut	cmlcados300003ywfccum8pu2	New enquiry submitted	natasya submitted a 3D Design enquiry.	UNREAD	2026-02-13 15:46:21.923	\N
cml2i061d00063ylu5jdlaotc	seed_admin	New enquiry submitted	test submitted a 3D Design enquiry.	UNREAD	2026-01-31 16:00:12.433	\N
cmll28fvn000b3y4xe82iyao0	cmlcg47j1000e3y3pdt712931	New enquiry submitted	natasya submitted a 3D Design enquiry.	UNREAD	2026-02-13 15:46:21.923	\N
cmll28fvn000c3y4x6tb6enzm	cmlcg8hvf00023yfd5qptvefp	New enquiry submitted	natasya submitted a 3D Design enquiry.	UNREAD	2026-02-13 15:46:21.923	\N
cml7fr98b00053y3mwo55evd4	seed_designer	Project created	Escrow project "3D Design for test" has been created with a 50/50 payment plan.	UNREAD	2026-02-04 02:56:08.316	\N
cml7k148f000f3y3m32ojr6xv	seed_admin	Deposit funded	Deposit received for project "3D Design for test".	UNREAD	2026-02-04 04:55:46.863	\N
cml7ktth000073ywkhmklfddi	seed_admin	Deposit funded	Deposit received for project "3D Design for test".	UNREAD	2026-02-04 05:18:05.941	\N
cml7lgd2f000g3ywkes5bgbf7	seed_admin	Deposit funded	Deposit received for project "3D Design for test".	UNREAD	2026-02-04 05:35:37.767	\N
seed_notification_1	seed_client	Welcome to Ayra	Your client portal is ready. Track projects and escrow updates here.	READ	2026-01-22 11:53:32.53	2026-02-04 06:39:18.414
seed_notification_3	seed_client	Escrow released	Escrow funds have been released to the company.	READ	2026-01-22 11:53:32.53	2026-02-04 06:39:18.414
cml7fr98b00043y3mybyo5ppc	seed_client	Project created	Escrow project "3D Design for test" has been created with a 50/50 payment plan.	READ	2026-02-04 02:56:08.316	2026-02-04 06:39:18.414
cml7ktth500083ywkdbl7r6f6	seed_client	Payment recorded	Payment recorded for "3D Design for test" via demo gateway.	READ	2026-02-04 05:18:05.945	2026-02-04 06:39:18.414
cml7lgd2h000h3ywky656vocb	seed_client	Payment recorded	Payment recorded for "3D Design for test" via demo gateway.	READ	2026-02-04 05:35:37.769	2026-02-04 06:39:18.414
cml7nuna300093ypxfat2bibm	seed_admin	New enquiry submitted	test submitted a 3D Design enquiry.	UNREAD	2026-02-04 06:42:43.419	\N
cml7oo53p00063yii6xdl34kb	seed_client	Project created	Escrow project "3D Design for test" has been created with a 50/50 payment plan.	UNREAD	2026-02-04 07:05:39.541	\N
cml7oo53p00073yiik1vjdq35	seed_designer	Project created	Escrow project "3D Design for test" has been created with a 50/50 payment plan.	UNREAD	2026-02-04 07:05:39.541	\N
cml7ozc0g000j3yiitpzlsdat	seed_admin	Deposit funded	Deposit received for project "3D Design for test".	UNREAD	2026-02-04 07:14:21.713	\N
cml7ozc0j000k3yiikgmcvbng	seed_client	Payment recorded	Payment recorded for "3D Design for test" via demo gateway.	UNREAD	2026-02-04 07:14:21.716	\N
cml7qf5d500193yiikk4bdtfj	seed_client	Draft uploaded	A draft has been submitted for "3D Design for test".	UNREAD	2026-02-04 07:54:39.21	\N
cml925y6200053ynzx2ocb5zc	seed_admin	New enquiry submitted	test submitted a 2D Design enquiry.	UNREAD	2026-02-05 06:11:11.546	\N
cml92fg4z000b3ynz8vqip3xt	seed_admin	New enquiry submitted	test submitted a 2D Design enquiry.	UNREAD	2026-02-05 06:18:34.739	\N
cml92qfeo00053yhq8pu9in0x	seed_admin	New enquiry submitted	test submitted a 2D Design enquiry.	UNREAD	2026-02-05 06:27:07.009	\N
cml93bldj00053y0lm6xa64ba	seed_admin	New enquiry submitted	test submitted a 2D Design enquiry.	UNREAD	2026-02-05 06:43:34.519	\N
cml93nys8000e3y0lw9o80z8w	seed_admin	New enquiry submitted	Tester submitted a 2D Design enquiry.	UNREAD	2026-02-05 06:53:11.768	\N
cml93xbv2000k3y0lrd3l2c6v	seed_admin	New enquiry submitted	Test Fix submitted a 2D Design enquiry.	UNREAD	2026-02-05 07:00:28.623	\N
cml940ehx000q3y0l9ahdrb95	seed_admin	New enquiry submitted	Test User submitted a 2D Design enquiry.	UNREAD	2026-02-05 07:02:52.006	\N
cml941o0e000w3y0lfi7ho9ld	seed_admin	New enquiry submitted	Test User submitted a 2D Design enquiry.	UNREAD	2026-02-05 07:03:50.99	\N
cml947w4y00123y0lbga7kcrm	seed_admin	New enquiry submitted	Debug Test submitted a 2D Design enquiry.	UNREAD	2026-02-05 07:08:41.458	\N
cml94ju3w00183y0lmajabrrr	seed_admin	New enquiry submitted	Full Test submitted a 2D Design enquiry.	UNREAD	2026-02-05 07:17:58.701	\N
cml94o6ut001g3y0lx2u7tkmb	seed_admin	New enquiry submitted	test submitted a 3D Design enquiry.	UNREAD	2026-02-05 07:21:21.845	\N
cml94vv3f001s3y0ldczi6581	seed_admin	Draft approved	Client approved the draft for "3D Design for test" and funded the balance.	UNREAD	2026-02-05 07:27:19.851	\N
cml94vv3i001t3y0l0fvydqhz	seed_client	Payment recorded	Payment recorded for "3D Design for test" via demo gateway.	UNREAD	2026-02-05 07:27:19.854	\N
cml94wjje00203y0lwpu8t2jl	seed_client	Funds released	Escrow for "3D Design for test" has been released to the company.	UNREAD	2026-02-05 07:27:51.531	\N
cml9lfg8m000c3yiv0c12bzlf	seed_admin	New enquiry submitted	test submitted a Renovation enquiry.	UNREAD	2026-02-05 15:10:27.574	\N
cml9lgud5000l3yivz8hu5x2i	seed_client	Project created	Escrow project "Renovation for test" has been created with a 50/50 payment plan.	UNREAD	2026-02-05 15:11:32.537	\N
cml9lgud5000m3yivk98am3sa	seed_designer	Project created	Escrow project "Renovation for test" has been created with a 50/50 payment plan.	UNREAD	2026-02-05 15:11:32.537	\N
cml9li2v3000v3yivhqvpdxkv	seed_admin	Deposit funded	Deposit received for project "Renovation for test".	UNREAD	2026-02-05 15:12:30.207	\N
cml9li2v5000w3yivtvayryj0	seed_client	Payment recorded	Payment recorded for "Renovation for test" via demo gateway.	UNREAD	2026-02-05 15:12:30.209	\N
cml9ljb1500133yivr5tfyvy1	seed_client	Draft uploaded	A draft has been submitted for "Renovation for test".	UNREAD	2026-02-05 15:13:27.449	\N
cml9lo05a001c3yivcnnv5msa	seed_admin	Draft approved	Client approved the draft for "Renovation for test" and funded the balance.	UNREAD	2026-02-05 15:17:06.622	\N
cml9lo05c001d3yiv0wqtcxqs	seed_client	Payment recorded	Payment recorded for "Renovation for test" via demo gateway.	UNREAD	2026-02-05 15:17:06.625	\N
cml9lpco8001k3yivgimay17l	seed_client	Funds released	Escrow for "Renovation for test" has been released to the company.	UNREAD	2026-02-05 15:18:09.513	\N
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payment" (id, "projectId", type, status, amount, "txHash", metadata, "createdAt") FROM stdin;
seed_payment_1	seed_project_1	DEPOSIT	COMPLETED	6000.000000000000000000000000000000	0x7f25f9f0b0e7c77fe68b1ac3b64c9f7c58c2b2c7d1d5085e9b0b8c3c9f6a1f01	\N	2026-01-22 11:53:32.519
seed_payment_2	seed_project_1	BALANCE	COMPLETED	6000.000000000000000000000000000000	0x2df390d5c3bd7ac6b5a3e9f0b2c7e0d7f1c8a3b0c4d5e6f7a8b9c0d1e2f3a4b5	\N	2026-01-22 11:53:32.519
seed_payment_3	seed_project_1	RELEASE	COMPLETED	12000.000000000000000000000000000000	0x9c2d8f73e2b4a6f0193c5d7e1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b	\N	2026-01-22 11:53:32.519
cml7lgd21000b3ywkzrb0miwr	cml7fr97u00013y3m1hajj6h0	DEPOSIT	COMPLETED	555.500000000000000000000000000000	0x5deaf3f931f444abe8ac25305a7f586bd899c48f792bce30c6a908b759b93099	{"mode": "FIAT", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-DEPOSIT-8ca82b17-d4c4-4c55-acec-12937301b20a", "bankUsername": "admin@ayra.local"}	2026-02-04 05:35:37.754
cml7ozbzz000e3yii436d03nn	cml7oo53a00033yiifa13qgyo	DEPOSIT	COMPLETED	1250.000000000000000000000000000000	0x6152cf38d85f0fcc110e6b351ef44c6caa50c149b5e262ea861135f5384382bc	{"mode": "FIAT", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-DEPOSIT-89898bc1-93d6-4a14-941d-875e0982c1e5", "bankUsername": "admin@ayra.local"}	2026-02-04 07:14:21.695
cml94vv30001n3y0ljj37ge9w	cml7oo53a00033yiifa13qgyo	BALANCE	COMPLETED	1250.000000000000000000000000000000	0xfd6373919d7ed6e739631826a73f4c64ac874ccf1a632183781dc0b54fc530f9	{"mode": "FIAT", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-BALANCE-9bd6c26b-6eb3-4509-a0f2-70947072dd43", "bankUsername": "admin@ayra.local"}	2026-02-05 07:27:19.836
cml94wjj6001y3y0l3tejgksv	cml7oo53a00033yiifa13qgyo	RELEASE	COMPLETED	2500.000000000000000000000000000000	0xa12df60c8420f918882e49db7c04088765ccce807f483c459f661bd7c120dc25	\N	2026-02-05 07:27:51.522
cml9li2ug000r3yivze8auk4h	cml9lgucu000i3yiv4kc42f4j	DEPOSIT	COMPLETED	1250.000000000000000000000000000000	0x70a8766c9deab1e24b591fe4bbfbbcccd17d611b650ac8e0a4358f6e600c6820	{"mode": "FIAT", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-DEPOSIT-ae87d689-ba01-4308-a4e8-25437c82d74f", "bankUsername": "admin@ayra.local"}	2026-02-05 15:12:30.184
cml9lo04x00183yivjy9cd6zy	cml9lgucu000i3yiv4kc42f4j	BALANCE	COMPLETED	1250.000000000000000000000000000000	0x97acb58b15a9f0f6177d0831d13387dcd12842b144e979d131daa0e8fb42195f	{"mode": "FIAT", "method": "FPX", "bankName": "Maybank", "provider": "MOCK", "reference": "MOCK-BALANCE-ef718da8-d8ae-4543-9696-dd43fd613768", "bankUsername": "admin@ayra.local"}	2026-02-05 15:17:06.609
cml9lpco2001i3yivw02sbjgv	cml9lgucu000i3yiv4kc42f4j	RELEASE	COMPLETED	2500.000000000000000000000000000000	0x59dd151858d0fa5c65b5a03e35f210982958df939ef871c7ee1c97a8e56e7bb0	\N	2026-02-05 15:18:09.506
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Project" (id, "enquiryId", "clientId", "designerId", "adminId", title, "quotedAmount", "depositAmount", "balanceAmount", status, "escrowAddress", "chainId", "reviewDueAt", "createdAt", "updatedAt", "escrowPaused") FROM stdin;
seed_project_1	seed_enquiry_1	seed_client	seed_designer	seed_admin	The Haven Residence	12000.000000000000000000000000000000	6000.000000000000000000000000000000	6000.000000000000000000000000000000	RELEASED	0x1000000000000000000000000000000000000001	31337	2026-01-20 11:53:32.518	2026-01-22 11:53:32.519	2026-01-22 11:53:32.519	f
cml7fr97u00013y3m1hajj6h0	cml2i061600053yluynpndehm	seed_client	seed_designer	seed_admin	3D Design for test	1111.000000000000000000000000000000	555.500000000000000000000000000000	555.500000000000000000000000000000	FUNDED	0x80e631DF9Eaa5B4c1F98ADCe3838cBF52eB7bDd9	31337	\N	2026-02-04 02:56:08.297	2026-02-04 05:35:37.754	f
cml7oo53a00033yiifa13qgyo	cml7nun9t00053ypxmdatyxad	seed_client	seed_designer	seed_admin	3D Design for test	2500.000000000000000000000000000000	1250.000000000000000000000000000000	1250.000000000000000000000000000000	RELEASED	0x80e631DF9Eaa5B4c1F98ADCe3838cBF52eB7bDd9	31337	2026-02-11 07:54:39.194	2026-02-04 07:05:39.526	2026-02-05 07:27:51.522	f
cml9lgucu000i3yiv4kc42f4j	cml9lfg8d00093yiv6f9rcabc	seed_client	seed_designer	seed_admin	Renovation for test	2500.000000000000000000000000000000	1250.000000000000000000000000000000	1250.000000000000000000000000000000	RELEASED	0x43b0DdEcb2AB93e6a993252Ca2D56723e4Ca94F4	31337	2026-02-12 15:13:27.441	2026-02-05 15:11:32.526	2026-02-05 15:18:09.506	f
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "userId", token, "expiresAt", "createdAt") FROM stdin;
cmkwudgnu00013yw3ztqnwzs3	seed_designer	ff58d7e9-effd-4604-b702-1f9011a91a4c	2026-02-03 16:59:51.064	2026-01-27 16:59:51.065
cml93msr100083y0lywfsjnpv	cml93msnl00063y0lnilq0cae	518fcf81-3da9-4b8f-800b-78ca91a9a922	2026-02-12 06:52:17.292	2026-02-05 06:52:17.293
cmlcadow200023ywffm26pgog	cmlcados300003ywfccum8pu2	0ab63ee9-2f79-4113-bb83-17507e2f3b51	2026-02-14 12:24:28.225	2026-02-07 12:24:28.226
cmlcbduat00023ypq8t08rp9x	cmlcbdu7c00003ypqa3omtvaw	8ae509ec-5b0f-49af-ba07-a43d2825b45b	2026-02-14 12:52:34.853	2026-02-07 12:52:34.853
cmlcbf4w000073ypq9ho2ov6c	cmlcbf21y00033ypqxwqyuecg	54ffdc6b-3423-4458-9846-96e584475bde	2026-02-14 12:53:35.231	2026-02-07 12:53:35.232
cmlcemj6u000a3yxj29vdxucn	seed_admin	e03c0c93-1546-4230-96f9-a47c26cfc1f6	2026-02-14 14:23:19.204	2026-02-07 14:23:19.205
cmlcf91jt00013y5xb6dmiyby	seed_admin	79b21491-3f84-4c95-8342-649312bb9a9e	2026-02-14 14:40:49.431	2026-02-07 14:40:49.433
cmlcg0l2b00093y3ph7rf34wm	cmlcg0f0300053y3px0hitt94	41cfebc9-6a9e-45f7-b054-3ea4c3dbc055	2026-02-14 15:02:14.434	2026-02-07 15:02:14.435
cmlcg1pln00013yanql8gaf5b	seed_admin	5847092f-3371-4cd9-9709-918d1eae742a	2026-02-14 15:03:06.97	2026-02-07 15:03:06.971
cmlcg2oqv00013ybefefevmdj	seed_admin	55b8a611-bba9-46c0-8ac9-bcf4e3bf9dcd	2026-02-14 15:03:52.518	2026-02-07 15:03:52.519
cmlcg47nm000g3y3pp412nr4g	cmlcg47j1000e3y3pdt712931	157a81cd-7a1c-419a-a2de-d9bff1088f44	2026-02-14 15:05:03.682	2026-02-07 15:05:03.683
cmlcg7hyp00013yfrg14pf5fn	seed_admin	54e86008-47f4-4604-aa65-28d96af9bfbd	2026-02-14 15:07:37.008	2026-02-07 15:07:37.009
cmlcg8hyz00043yfdmyzg5sxc	cmlcg8hvf00023yfd5qptvefp	7b4262c3-120e-4e90-910e-dd0c3e004f7b	2026-02-14 15:08:23.674	2026-02-07 15:08:23.675
cmldj2mcu00043ykcnkcpo1nw	seed_admin	6859dff0-2ea2-4ffe-821f-93bdc5342ca3	2026-02-15 09:15:34.445	2026-02-08 09:15:34.446
cmll2t87h000e3y4x20l1luv4	seed_admin	bc3b6d5d-d10a-44e8-af75-108128edad1f	2026-02-20 16:02:31.756	2026-02-13 16:02:31.757
cmlmkc24800013y8klkrs9qwr	seed_admin	c580b9f2-ce14-4d35-8ae7-56faf56ebb78	2026-02-21 17:00:49.975	2026-02-14 17:00:49.976
\.


--
-- Data for Name: TimelineEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimelineEvent" (id, "projectId", "actorId", "eventType", message, "txHash", metadata, "createdAt") FROM stdin;
seed_timeline_1	seed_project_1	seed_admin	PROJECT_CREATED	Project created from enquiry.	\N	\N	2026-01-22 11:53:32.519
seed_timeline_2	seed_project_1	seed_client	DEPOSIT_FUNDED	Client funded the 50% deposit.	\N	\N	2026-01-22 11:53:32.519
seed_timeline_3	seed_project_1	seed_designer	DRAFT_SUBMITTED	Draft deliverable uploaded.	\N	{"hash": "d01e30c7cd99f384c82cd7531c25f75feb2ef2e489c7d74d6a2460764e465312"}	2026-01-22 11:53:32.519
seed_timeline_4	seed_project_1	seed_client	DRAFT_APPROVED	Client approved the draft and funded the balance.	\N	\N	2026-01-22 11:53:32.519
seed_timeline_5	seed_project_1	seed_admin	FUNDS_RELEASED	Admin released escrow funds to the company.	\N	\N	2026-01-22 11:53:32.519
cml7fr97u00033y3mfdrnnynq	cml7fr97u00013y3m1hajj6h0	seed_admin	PROJECT_CREATED	Project created from enquiry.	\N	\N	2026-02-04 02:56:08.297
cml7lgd21000a3ywkk87rifwg	cml7fr97u00013y3m1hajj6h0	seed_client	DEPOSIT_FUNDED	Client paid the 50% deposit via fiat gateway (demo).	0x5deaf3f931f444abe8ac25305a7f586bd899c48f792bce30c6a908b759b93099	\N	2026-02-04 05:35:37.754
cml7oo53a00053yii5gvs3sie	cml7oo53a00033yiifa13qgyo	seed_admin	PROJECT_CREATED	Project created from enquiry.	\N	\N	2026-02-04 07:05:39.526
cml7ozbzz000d3yiie2tsk5fk	cml7oo53a00033yiifa13qgyo	seed_client	DEPOSIT_FUNDED	Client paid the 50% deposit via fiat gateway (demo).	0x6152cf38d85f0fcc110e6b351ef44c6caa50c149b5e262ea861135f5384382bc	\N	2026-02-04 07:14:21.695
cml7qf5cr00183yiicajb7qkg	cml7oo53a00033yiifa13qgyo	seed_designer	DRAFT_SUBMITTED	Draft deliverable uploaded.	\N	{"hash": "4e6f3c2a5a2c278bdf7c92e051a9fdbe47abbcdaea42ada5f248a20dddc21e98"}	2026-02-04 07:54:39.196
cml94vv30001m3y0l6vwd4h6e	cml7oo53a00033yiifa13qgyo	seed_client	DRAFT_APPROVED	Client approved the draft and paid the balance via fiat gateway (demo).	0xfd6373919d7ed6e739631826a73f4c64ac874ccf1a632183781dc0b54fc530f9	\N	2026-02-05 07:27:19.836
cml94wjj6001x3y0lm5wzbrz2	cml7oo53a00033yiifa13qgyo	seed_admin	FUNDS_RELEASED	Admin released escrow funds to the company.	0xa12df60c8420f918882e49db7c04088765ccce807f483c459f661bd7c120dc25	\N	2026-02-05 07:27:51.522
cml9lgucu000k3yivvtdbml8s	cml9lgucu000i3yiv4kc42f4j	seed_admin	PROJECT_CREATED	Project created from enquiry.	\N	\N	2026-02-05 15:11:32.526
cml9li2ug000q3yivkwrgh5z4	cml9lgucu000i3yiv4kc42f4j	seed_client	DEPOSIT_FUNDED	Client paid the 50% deposit via fiat gateway (demo).	0x70a8766c9deab1e24b591fe4bbfbbcccd17d611b650ac8e0a4358f6e600c6820	\N	2026-02-05 15:12:30.184
cml9ljb0y00123yivifemc5qv	cml9lgucu000i3yiv4kc42f4j	seed_designer	DRAFT_SUBMITTED	Draft deliverable uploaded.	\N	{"hash": "4e6f3c2a5a2c278bdf7c92e051a9fdbe47abbcdaea42ada5f248a20dddc21e98"}	2026-02-05 15:13:27.442
cml9lo04x00173yivurnz9uce	cml9lgucu000i3yiv4kc42f4j	seed_client	DRAFT_APPROVED	Client approved the draft and paid the balance via fiat gateway (demo).	0x97acb58b15a9f0f6177d0831d13387dcd12842b144e979d131daa0e8fb42195f	\N	2026-02-05 15:17:06.609
cml9lpco2001h3yivls7s4eyf	cml9lgucu000i3yiv4kc42f4j	seed_admin	FUNDS_RELEASED	Admin released escrow funds to the company.	0x59dd151858d0fa5c65b5a03e35f210982958df939ef871c7ee1c97a8e56e7bb0	\N	2026-02-05 15:18:09.506
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "passwordHash", role, "mfaEnabled", "mfaSecret", "createdAt", "updatedAt", "walletAddress", "walletPrivateKey", "emailVerified") FROM stdin;
seed_designer	Dina Designer	designer@ayra.local	$2b$10$OOiN5no58YStuoE.7rJXbehUzWZuxaI/g/myTboAqMYlZ29WQgNX2	DESIGNER	f	\N	2026-01-22 11:53:32.507	2026-01-22 11:53:32.507	\N	\N	t
cmkwxar1w00003yn36nd6w4bi	Test User	test@example.com	$2b$10$OhQU.Z4C6ppSPL.edChvSO/TKjJiMcxKOkUKHXWMeIY2uqlg50d4.	CLIENT	f	\N	2026-01-27 18:21:43.413	2026-01-27 18:21:43.413	0x1f5425Ec0FCB0087Ce96f61e0f862156E230A922	0xee96569ac695fa976977c68d9a279349f2c35468cb7030f3d154c35f799eb52c	t
cmkwxeeyj00063yn3hx8lp2ft	Designer User	designer@example.com	$2b$10$MTNZ4gDR8YSS4L89ILfvtOzb7ixg2FOqHFEBrPhDEy.MfjmiYwbbm	DESIGNER	f	\N	2026-01-27 18:24:34.363	2026-01-27 18:24:34.363	0x4EA4e2baC7746990db5A278bA873056C42eA5c9E	0x1cfeb01b6cbab6dbb7587fc13cb8c50fe37123b871dcfdcc4754c8d2a01ebc63	t
seed_admin	Ayra Admin	admin@ayra.local	$2b$10$OOiN5no58YStuoE.7rJXbehUzWZuxaI/g/myTboAqMYlZ29WQgNX2	ADMIN	f	\N	2026-01-22 11:53:32.507	2026-01-31 16:08:19.46	0x8D7860914D08Ef2A276e0cF699017666D88D6f65	0x5dd06c1eca4cffed1381a577efe296af0ce40ec36e5d577f55e0b924caaf0888	t
seed_client	Chris Client	client@ayra.local	$2b$10$OOiN5no58YStuoE.7rJXbehUzWZuxaI/g/myTboAqMYlZ29WQgNX2	CLIENT	f	\N	2026-01-22 11:53:32.507	2026-01-31 16:08:19.484	0x220a8c43aCa350676dCa328025a9737B9Dc82021	0x94074c780b01faca1ef81c7e83610f6536a0941ec690363a491690f9422d7b8f	t
cml93msnl00063y0lnilq0cae	Tester	tester2@example.com	$2b$10$NmwD7ugiCzjJI5sZnvt.PeB6xy5/ALPDBcIij9ZptaEmHamAFFIVW	CLIENT	f	\N	2026-02-05 06:52:17.169	2026-02-05 06:52:17.169	0xE5CBB8F03243d8464772A21cE4ddA3b085BE64d4	0xcfe261ceaddd0a16d8bd2723c1df76c34a75a4b9354585854ee801c1f93af7e8	t
cmlcados300003ywfccum8pu2	Integration Invite User	invitee+1770466945425@ayra.local	$2b$10$/m6rMKCJHIyQdVgUEdyDQeXJ.ozvsCpcF5PH8yJwo4A6BCpOM9U.e	ADMIN	f	\N	2026-02-07 12:24:28.084	2026-02-07 12:24:28.084	0x68dD57b58A570A000aaB3ccc6C478e6957Ff6344	0x758f322e3bd25d3e083db1d2a4d5273710e9187621855317ee89010623b2245a	t
cmlcbdu7c00003ypqa3omtvaw	Integration Designer	invitee+1770468411958@ayra.local	$2b$10$pWm7BG9DzVDUXxGPKFt7nOCWUI9/T4w6iie82zi6FpJ1nSi0sF06e	DESIGNER	f	\N	2026-02-07 12:52:34.729	2026-02-07 12:52:34.729	0xed2f46524dfcaDd78f5b79A55FBA2c354b69E4df	0x6ba3653edd9700ef7d743311d8a7132c8907c2840d8bb0b9a672379e689cb66d	t
cmlcbf21y00033ypqxwqyuecg	Client E2E User	client.e2e+1770468811458@ayra.local	$2b$10$XAUuaCYG7jvpTgH6IznmqOCOdv0/XWKrNX6a9rmaMxkdUKozTNq6m	CLIENT	f	\N	2026-02-07 12:53:31.558	2026-02-07 12:53:35.23	0x56Fa92935D4Cad4a6Bc87F7fC54a36F69425e03c	0x63d69329734dfbc4f348867d9d41703ecb5a7577af6db81ca6016efe98923a15	t
cmlcbka5500003yxj3suwct3h	test new email client	pilime1477@dnsclick.com	$2b$10$d4kQT5.89d81RCS6XU4YWu/T.GC.GHH4LkrXHe5sseoERHFV9xOMe	CLIENT	f	\N	2026-02-07 12:57:35.322	2026-02-07 12:57:58.259	0x4Dfa3B1a9bB633CECf646a8c943184099413a11D	0x219191d7c5470f67163dc4ba29948232659168ccf7b0eddf6d7f4f88101b91bc	t
cmlcfw6pg00003y3pq1vexzml	OTP Tunnel Test	syafiqmajid286+otp1770476328714@gmail.com	$2b$10$3U52dWVt4m6Vuarz6hb/ue5uPpdrUHeT0RhECDJU6Nie/usdbCyrm	CLIENT	f	\N	2026-02-07 14:58:49.204	2026-02-07 14:58:49.204	0xC4345878E9134762af61031b22C688914e0bc62c	0xadc08b8cf751adbbc8eebe69afcf5ef20796f742fb0de8ee0dbbdd2ad37f53a7	f
cmlcg0f0300053y3px0hitt94	OTP Tunnel E2E	syafiqmajid286+otp1770476524919@gmail.com	$2b$10$nr/8IjhsP/d8ZO70Sm7NyeiHwuQAPeKhqtQroHSf5ZWMJtBmrnmSG	CLIENT	f	\N	2026-02-07 15:02:06.579	2026-02-07 15:02:14.432	0xE2C0337A083ab69D083FF9520744A73a9892dC7A	0x0e4b2f79d0106a37c636551cf5122a641b8c2fe32161b11904714568f5d83254	t
cmlcg47j1000e3y3pdt712931	Invite Tunnel User	syafiqmajid286+invite1770476632496@gmail.com	$2b$10$yakmMbDG3EgtoLlSXmXWvexnW/EmhsSSkTpT6YbsP2ZX/D0MTZxkq	ADMIN	f	\N	2026-02-07 15:05:03.517	2026-02-07 15:05:03.517	0xE34558c7FB2E7B2F9C73B1c5F8A3E96df9a07E16	0x1046776ab88df0670afc632cd275828ffa6504319777675356c1116628967d27	t
cmlcg8hvf00023yfd5qptvefp	Invite Link E2E	syafiqmajid286+invite1770476856983@gmail.com	$2b$10$7L/cE1kEgcvUjF5buaoR2u0UOdQ4vYJnRrKJLOE8GFGTr/BcBLoGG	ADMIN	f	\N	2026-02-07 15:08:23.548	2026-02-07 15:08:23.548	0xaB73328f58c1a4aBFa6Ff8f139bAC303a11DC165	0x732733ef335f3a70265178bb4c9a1717b7d74c00d925202ef43e64eb30a13cdb	t
cmldj1f3i00003ykcbdds7pf1	Security  User	sec_test_1770542078213@example.com	$2b$10$Pba14IU./j/ZaZKCjt1.5OpZz1YnOUO0GSzRSSJI9RdjBUQ4QvrVq	CLIENT	f	\N	2026-02-08 09:14:38.383	2026-02-08 09:14:38.383	0xdDA5E48134d7D7c1604265510a3F751CD1be6a81	0xcbd1b51267f6405e45c06cd4f61ca6fcdb7fecb18434d37953fc0573e16cd6ee	f
cmlkiylhh00003y61nobv7xcx	test create account	testcreateaccount@gmail.com	$2b$10$HoG36Vsnr/XjrwOh4YBNVekBdMZi.I9z3mohtG5Tsz5iP8EcyeJli	CLIENT	f	\N	2026-02-13 06:46:49.925	2026-02-13 06:46:49.925	0xF3ACb5aba2354dDe45B328F0EE2a4bac7424a939	0x49780979e3f458f504d4692a8517e1b71047907a0a2804cb74cf1134794f9645	f
cmll1yygq00023y4xuxg51nqk	Natasya	yasminnatasya29@gmail.com	$2b$10$vhVBZtrrhsv.99Yw6OMrnOB45/tY2Qlg23IIUCEieUyx7/nmLb5PK	CLIENT	f	\N	2026-02-13 15:38:59.451	2026-02-13 15:39:24.337	0xE521a75Cbb90CE5536C80f918eadfe56ccA58901	0x7edee99d24bbb45db1b377af1c484f96591a3e645a5897e07eed1e67ad830713	t
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
36047767-c745-4fbb-b97f-8a2269297f86	86a73a6317148d635288e115e1b2ce68a3e6baa31f137995e3bfd8002b3efa94	2026-01-13 15:36:04.881315+00	20260113153604_init	\N	\N	2026-01-13 15:36:04.848944+00	1
d8fb114a-4a24-4b16-b061-26d6aad33480	4fd1f6a54405c20c825275040f62af7d7101a3c8fbae7967525e936f675a412e	2026-01-28 14:00:26.497364+00	20260127093000_add_escrow_paused	\N	\N	2026-01-28 14:00:26.482117+00	1
38139afa-056a-4dcf-88bf-b21a2e2ccc15	9e5fca8dd1e18ef286e6d60fa78a9bcbb8effa9f0dc97f0dd6a4c95785bdfd5c	2026-01-28 14:00:26.514819+00	20260127121500_add_dispute_files	\N	\N	2026-01-28 14:00:26.497816+00	1
1576b54c-0823-47a1-8e80-f8c33132c3b9	e573d26c9225355021e1127ded9978b0c836f75b8178d295bf4cb43fa4494943	2026-02-07 12:21:13.998217+00	20260130093000_add_user_wallet_columns	\N	\N	2026-02-07 12:21:13.988818+00	1
96020962-6b14-4c11-bb1c-974c68e7e509	c7d6a4cd5a1dfed10c4843cad29aa8bd5c6a1741bead4aaf9572cf30ca9c5b83	2026-02-07 12:21:14.002124+00	20260204123000_add_admin_invites	\N	\N	2026-02-07 12:21:13.998674+00	1
45c88a04-fd04-4e51-ac91-24388c94690a	d7d4521eb50d5461704e94561da354015c80342c8aaa0f3f308bac7e0ee6d2f5	2026-02-07 12:42:34.837238+00	20260207130000_invite_roles_and_email_verification	\N	\N	2026-02-07 12:42:34.815794+00	1
\.


--
-- Name: AdminInvite AdminInvite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminInvite"
    ADD CONSTRAINT "AdminInvite_pkey" PRIMARY KEY (id);


--
-- Name: ChainEvent ChainEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChainEvent"
    ADD CONSTRAINT "ChainEvent_pkey" PRIMARY KEY (id);


--
-- Name: DisputeFile DisputeFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisputeFile"
    ADD CONSTRAINT "DisputeFile_pkey" PRIMARY KEY (id);


--
-- Name: Dispute Dispute_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dispute"
    ADD CONSTRAINT "Dispute_pkey" PRIMARY KEY (id);


--
-- Name: Draft Draft_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Draft"
    ADD CONSTRAINT "Draft_pkey" PRIMARY KEY (id);


--
-- Name: EnquiryFile EnquiryFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EnquiryFile"
    ADD CONSTRAINT "EnquiryFile_pkey" PRIMARY KEY (id);


--
-- Name: Enquiry Enquiry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Enquiry"
    ADD CONSTRAINT "Enquiry_pkey" PRIMARY KEY (id);


--
-- Name: MfaCode MfaCode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MfaCode"
    ADD CONSTRAINT "MfaCode_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: TimelineEvent TimelineEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimelineEvent"
    ADD CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AdminInvite_acceptedUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminInvite_acceptedUserId_idx" ON public."AdminInvite" USING btree ("acceptedUserId");


--
-- Name: AdminInvite_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminInvite_email_idx" ON public."AdminInvite" USING btree (email);


--
-- Name: AdminInvite_invitedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminInvite_invitedById_idx" ON public."AdminInvite" USING btree ("invitedById");


--
-- Name: AdminInvite_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminInvite_role_idx" ON public."AdminInvite" USING btree (role);


--
-- Name: AdminInvite_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AdminInvite_tokenHash_key" ON public."AdminInvite" USING btree ("tokenHash");


--
-- Name: ChainEvent_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChainEvent_projectId_idx" ON public."ChainEvent" USING btree ("projectId");


--
-- Name: ChainEvent_txHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChainEvent_txHash_idx" ON public."ChainEvent" USING btree ("txHash");


--
-- Name: DisputeFile_disputeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DisputeFile_disputeId_idx" ON public."DisputeFile" USING btree ("disputeId");


--
-- Name: DisputeFile_uploadedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DisputeFile_uploadedById_idx" ON public."DisputeFile" USING btree ("uploadedById");


--
-- Name: Dispute_decidedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Dispute_decidedById_idx" ON public."Dispute" USING btree ("decidedById");


--
-- Name: Dispute_openedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Dispute_openedById_idx" ON public."Dispute" USING btree ("openedById");


--
-- Name: Dispute_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Dispute_projectId_idx" ON public."Dispute" USING btree ("projectId");


--
-- Name: Draft_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Draft_projectId_idx" ON public."Draft" USING btree ("projectId");


--
-- Name: Draft_uploadedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Draft_uploadedById_idx" ON public."Draft" USING btree ("uploadedById");


--
-- Name: EnquiryFile_enquiryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EnquiryFile_enquiryId_idx" ON public."EnquiryFile" USING btree ("enquiryId");


--
-- Name: Enquiry_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Enquiry_clientId_idx" ON public."Enquiry" USING btree ("clientId");


--
-- Name: MfaCode_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MfaCode_expiresAt_idx" ON public."MfaCode" USING btree ("expiresAt");


--
-- Name: MfaCode_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MfaCode_userId_idx" ON public."MfaCode" USING btree ("userId");


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: Payment_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_projectId_idx" ON public."Payment" USING btree ("projectId");


--
-- Name: Project_adminId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_adminId_idx" ON public."Project" USING btree ("adminId");


--
-- Name: Project_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_clientId_idx" ON public."Project" USING btree ("clientId");


--
-- Name: Project_designerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_designerId_idx" ON public."Project" USING btree ("designerId");


--
-- Name: Project_enquiryId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_enquiryId_key" ON public."Project" USING btree ("enquiryId");


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: TimelineEvent_actorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimelineEvent_actorId_idx" ON public."TimelineEvent" USING btree ("actorId");


--
-- Name: TimelineEvent_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimelineEvent_projectId_idx" ON public."TimelineEvent" USING btree ("projectId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_walletAddress_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_walletAddress_key" ON public."User" USING btree ("walletAddress");


--
-- Name: AdminInvite AdminInvite_acceptedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminInvite"
    ADD CONSTRAINT "AdminInvite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AdminInvite AdminInvite_invitedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminInvite"
    ADD CONSTRAINT "AdminInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ChainEvent ChainEvent_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChainEvent"
    ADD CONSTRAINT "ChainEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DisputeFile DisputeFile_disputeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisputeFile"
    ADD CONSTRAINT "DisputeFile_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES public."Dispute"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DisputeFile DisputeFile_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DisputeFile"
    ADD CONSTRAINT "DisputeFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispute Dispute_decidedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dispute"
    ADD CONSTRAINT "Dispute_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Dispute Dispute_openedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dispute"
    ADD CONSTRAINT "Dispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispute Dispute_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dispute"
    ADD CONSTRAINT "Dispute_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Draft Draft_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Draft"
    ADD CONSTRAINT "Draft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Draft Draft_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Draft"
    ADD CONSTRAINT "Draft_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EnquiryFile EnquiryFile_enquiryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EnquiryFile"
    ADD CONSTRAINT "EnquiryFile_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES public."Enquiry"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Enquiry Enquiry_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Enquiry"
    ADD CONSTRAINT "Enquiry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MfaCode MfaCode_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MfaCode"
    ADD CONSTRAINT "MfaCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Project Project_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_designerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Project Project_enquiryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES public."Enquiry"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TimelineEvent TimelineEvent_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimelineEvent"
    ADD CONSTRAINT "TimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimelineEvent TimelineEvent_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimelineEvent"
    ADD CONSTRAINT "TimelineEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict zOOoIRsXferXjQftg81hbLUXxuTssseyuLg6LXfjt855A4L05yr0HwWJi0RYrrl

