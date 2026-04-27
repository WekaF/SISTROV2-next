/*
============================================================
  SISTRODEV v3 - FIXED PostgreSQL SCHEMA
  Target: PostgreSQL 14+
  Fixed: 2026-04-25

  BUGS FIXED FROM ORIGINAL:
  1. All indexes had SQL Server "]" bracket syntax — removed
  2. 22 FK constraints referenced non-existent columns — removed
  3. Additional optimized indexes with wrong column names — fixed
  4. Self-referential FKs on same column (posto, posto_deleted, rute) — removed
  5. FK fk_rute_ruteid_94 referenced non-existent PK column — removed
============================================================
*/

CREATE SCHEMA IF NOT EXISTS wtc;

-- ============================================================
-- TABLES
-- ============================================================

DROP TABLE IF EXISTS public.antrian CASCADE;
CREATE TABLE public.antrian (
    id SERIAL NOT NULL,
    ticketid VARCHAR(50) NOT NULL,
    storageid VARCHAR(50),
    updatedon TIMESTAMP(3),
    timekosong TIMESTAMP(3),
    status VARCHAR(50),
    skipcount INTEGER,
    lastskiptime TIMESTAMP(3),
    revised VARCHAR(255),
    pic VARCHAR(255),
    CONSTRAINT pk_antrian PRIMARY KEY (ticketid)
);

DROP TABLE IF EXISTS public.antrianhistory CASCADE;
CREATE TABLE public.antrianhistory (
    id SERIAL NOT NULL,
    ticketid BIGINT NOT NULL,
    storageid VARCHAR(50),
    updatedon TIMESTAMP(3),
    bookingcode VARCHAR(50),
    CONSTRAINT pk_antrianhistory PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.antrianlini3 CASCADE;
CREATE TABLE public.antrianlini3 (
    id SERIAL NOT NULL,
    ticketid VARCHAR(50) NOT NULL,
    plant VARCHAR(50),
    updatedon TIMESTAMP(3),
    timekosong TIMESTAMP(3),
    status VARCHAR(50),
    CONSTRAINT pk_antrianlini3 PRIMARY KEY (ticketid)
);

DROP TABLE IF EXISTS public.apilog CASCADE;
CREATE TABLE public.apilog (
    id SERIAL NOT NULL,
    timestamp TIMESTAMP(3),
    endpoint VARCHAR(100),
    ipaddress VARCHAR(50),
    username VARCHAR(100),
    requestbody TEXT,
    executiontimems INTEGER,
    statusresponse VARCHAR(10),
    errormessage TEXT
);

DROP TABLE IF EXISTS public.appconfig CASCADE;
CREATE TABLE public.appconfig (
    id SERIAL NOT NULL,
    keysetting VARCHAR(50),
    value VARCHAR(255),
    CONSTRAINT pk_appconfig PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.applog CASCADE;
CREATE TABLE public.applog (
    id SERIAL NOT NULL,
    title VARCHAR(50),
    oldvalue VARCHAR(50),
    newvalue VARCHAR(50),
    relatedtable VARCHAR(50),
    updatedby VARCHAR(50),
    updatedon TIMESTAMP(3),
    location VARCHAR(50),
    relatedid VARCHAR(50),
    CONSTRAINT pk_applog PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.armada CASCADE;
CREATE TABLE public.armada (
    id SERIAL NOT NULL,
    transportcode VARCHAR(255),
    nopol VARCHAR(50),
    updatedby VARCHAR(50),
    updatedon TIMESTAMP(3),
    sumbu VARCHAR(50),
    jeniskendaraan VARCHAR(50),
    qtymax NUMERIC(18, 2),
    kir VARCHAR(255),
    jbi NUMERIC(18, 2),
    beratkendaraan NUMERIC(18, 2),
    beratpenumpang NUMERIC(18, 2),
    d243 BOOLEAN,
    f207 BOOLEAN,
    log4meneng BOOLEAN,
    pim BOOLEAN,
    pkc BOOLEAN,
    pkg BOOLEAN,
    medan BOOLEAN,
    cilacap BOOLEAN,
    romo BOOLEAN,
    b205 BOOLEAN,
    f249 BOOLEAN,
    lombok BOOLEAN,
    files1 TEXT,
    files2 TEXT,
    approver VARCHAR(50),
    approve BOOLEAN,
    revised VARCHAR(50),
    charter BOOLEAN,
    makasar2 BOOLEAN,
    banjarmasin2 BOOLEAN,
    f257 BOOLEAN,
    tahun_pembuatan INTEGER,
    no_rangka_stnk VARCHAR(50),
    no_mesin_stnk VARCHAR(50),
    masa_berlaku_kir DATE,
    no_rangka_kir VARCHAR(50),
    no_mesin_kir VARCHAR(50),
    status_armada VARCHAR(20),
    CONSTRAINT pk_armada PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.armadamapping CASCADE;
CREATE TABLE public.armadamapping (
    id SERIAL NOT NULL,
    armada INTEGER,
    company_code VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(255),
    CONSTRAINT pk_armadamapping PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.armadareview CASCADE;
CREATE TABLE public.armadareview (
    id SERIAL NOT NULL,
    transportcode VARCHAR(255),
    nopol VARCHAR(50),
    updatedby VARCHAR(50),
    updatedon TIMESTAMP(3),
    sumbu VARCHAR(50),
    jeniskendaraan VARCHAR(50),
    qtymax NUMERIC(18, 2),
    kir VARCHAR(255),
    jbi NUMERIC(18, 2),
    beratkendaraan NUMERIC(18, 2),
    beratpenumpang NUMERIC(18, 2),
    pkg BOOLEAN,
    meneng BOOLEAN,
    dsp BOOLEAN,
    pkc BOOLEAN,
    pim BOOLEAN,
    medan BOOLEAN,
    semarang BOOLEAN,
    cilacap BOOLEAN,
    approver VARCHAR(50),
    approve BOOLEAN,
    files1 TEXT,
    files2 TEXT,
    statusinput VARCHAR(50),
    idarmadabefore INTEGER,
    charter BOOLEAN,
    tahun_pembuatan INTEGER,
    no_rangka_stnk VARCHAR(50),
    no_mesin_stnk VARCHAR(50),
    masa_berlaku_kir DATE,
    no_rangka_kir VARCHAR(50),
    no_mesin_kir VARCHAR(50),
    status_armada VARCHAR(20),
    CONSTRAINT pk_armadareview PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.armada_deleted_alasan CASCADE;
CREATE TABLE public.armada_deleted_alasan (
    id SERIAL NOT NULL,
    nopol VARCHAR(50),
    transport VARCHAR(50),
    reason VARCHAR(255),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(50),
    CONSTRAINT pk_armada_deleted_alasan PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.armada_upload CASCADE;
CREATE TABLE public.armada_upload (
    id SERIAL NOT NULL,
    username VARCHAR(50),
    nopol VARCHAR(50),
    uploadcode VARCHAR(50),
    updatedby VARCHAR(50),
    updatedon TIMESTAMP(3),
    sumbu VARCHAR(50),
    jeniskendaraan VARCHAR(50),
    qtymax NUMERIC(18, 2),
    kir VARCHAR(255),
    jbi NUMERIC(18, 2),
    beratkendaraan NUMERIC(18, 2),
    beratpenumpang NUMERIC(18, 2),
    tahun_pembuatan INTEGER,
    no_rangka_stnk VARCHAR(50),
    no_mesin_stnk VARCHAR(50),
    masa_berlaku_kir DATE,
    no_rangka_kir VARCHAR(50),
    no_mesin_kir VARCHAR(50),
    status_armada VARCHAR(20),
    CONSTRAINT pk_armada_upload PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.aspnetroles CASCADE;
CREATE TABLE public.aspnetroles (
    id VARCHAR(128) NOT NULL,
    name VARCHAR(1024),
    shortdesc VARCHAR(50),
    longdesc VARCHAR(255),
    activated VARCHAR(50),
    truk BOOLEAN,
    container BOOLEAN,
    company VARCHAR(50),
    allcompany BOOLEAN,
    wilayah VARCHAR(50),
    bagian VARCHAR(50),
    scope VARCHAR(50),
    no INTEGER,
    company_code VARCHAR(50)
);

DROP TABLE IF EXISTS public.aspnettokens CASCADE;
CREATE TABLE public.aspnettokens (
    id SERIAL NOT NULL,
    id_user VARCHAR(128),
    tokenemail TEXT,
    tokenphonenumber TEXT,
    updatedon TIMESTAMP(3),
    CONSTRAINT pk_aspnettokens PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.aspnetuserclaims CASCADE;
CREATE TABLE public.aspnetuserclaims (
    id SERIAL NOT NULL,
    userid VARCHAR(128) NOT NULL,
    claimtype VARCHAR(4000),
    claimvalue VARCHAR(4000)
);

DROP TABLE IF EXISTS public.aspnetuserlogins CASCADE;
CREATE TABLE public.aspnetuserlogins (
    loginprovider VARCHAR(128) NOT NULL,
    providerkey VARCHAR(128) NOT NULL,
    userid VARCHAR(128) NOT NULL
);

DROP TABLE IF EXISTS public.aspnetuserroles CASCADE;
CREATE TABLE public.aspnetuserroles (
    userid VARCHAR(128) NOT NULL,
    roleid VARCHAR(128) NOT NULL,
    updatedon TIMESTAMP(3),
    id SERIAL NOT NULL
);

DROP TABLE IF EXISTS public.aspnetusers CASCADE;
CREATE TABLE public.aspnetusers (
    id VARCHAR(128) NOT NULL,
    email VARCHAR(1024),
    emailconfirmed BOOLEAN NOT NULL,
    passwordhash VARCHAR(4000),
    securitystamp VARCHAR(4000),
    phonenumber VARCHAR(4000),
    phonenumberconfirmed BOOLEAN NOT NULL,
    twofactorenabled BOOLEAN NOT NULL,
    lockoutenddateutc TIMESTAMP(3),
    lockoutenabled BOOLEAN NOT NULL,
    accessfailedcount INTEGER NOT NULL,
    username VARCHAR(128),
    department VARCHAR(50),
    bagian VARCHAR(50),
    abbrev VARCHAR(50),
    fullname VARCHAR(255),
    warehouse_code VARCHAR(50),
    company_code VARCHAR(50),
    id2 SERIAL NOT NULL,
    updatedon TIMESTAMP(3),
    token TEXT,
    tujuan VARCHAR(50),
    mfaid VARCHAR(255),
    mfaemailid VARCHAR(50),
    mfasmsid VARCHAR(255),
    isidentik BOOLEAN,
    mfaremember BOOLEAN,
    username1 VARCHAR(255),
    lastlogin TIMESTAMP(3),
    CONSTRAINT pk_aspnetusers PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.company CASCADE;
CREATE TABLE public.company (
    company_code VARCHAR(50) NOT NULL,
    company VARCHAR(255),
    groupcompany VARCHAR(50),
    urutan INTEGER,
    timbangan BOOLEAN,
    cluster BOOLEAN,
    timezone INTEGER,
    onestaff BOOLEAN,
    deleteticketall BOOLEAN,
    odol BOOLEAN,
    duplicateticketall BOOLEAN,
    signature BOOLEAN,
    asalthesamemuat BOOLEAN,
    so BOOLEAN,
    autoqtymaxarmada BOOLEAN,
    statusplant BOOLEAN,
    tahunpembuatan BOOLEAN,
    percepatan BOOLEAN,
    CONSTRAINT pk_company PRIMARY KEY (company_code)
);

DROP TABLE IF EXISTS public.delivery_order CASCADE;
CREATE TABLE public.delivery_order (
    id BIGSERIAL NOT NULL,
    tanggaldo TIMESTAMP(3),
    tanggalgi TIMESTAMP(3),
    asal VARCHAR(50),
    tujuan VARCHAR(50),
    transporter TEXT,
    transportermode VARCHAR(50),
    nopol VARCHAR(50),
    driver VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby TEXT,
    company_code VARCHAR(50),
    number VARCHAR(50),
    CONSTRAINT pk_delivery_order PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.delivery_order_product CASCADE;
CREATE TABLE public.delivery_order_product (
    id BIGSERIAL NOT NULL,
    id_delivery BIGINT,
    id_product VARCHAR(255),
    CONSTRAINT pk_delivery_order_product PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.gudang CASCADE;
CREATE TABLE public.gudang (
    id VARCHAR(50) NOT NULL,
    kabupaten VARCHAR(50),
    tipe INTEGER,
    deskripsi VARCHAR(200),
    wil VARCHAR(50),
    alamat VARCHAR(4000),
    kodekecamatan VARCHAR(50),
    kecamatan VARCHAR(50),
    kodekabupaten VARCHAR(50),
    kodepropinsi VARCHAR(50),
    propinsi VARCHAR(50),
    textlonglat VARCHAR(50),
    long VARCHAR(50),
    lat VARCHAR(50),
    company_code VARCHAR(50),
    pkg BOOLEAN,
    f207 BOOLEAN,
    d243 BOOLEAN,
    pkc BOOLEAN,
    log4meneng BOOLEAN,
    pim BOOLEAN,
    medan BOOLEAN,
    cilacap BOOLEAN,
    romo BOOLEAN,
    b205 BOOLEAN,
    f249 BOOLEAN,
    lombok BOOLEAN,
    makasar2 BOOLEAN,
    banjarmasin2 BOOLEAN,
    f257 BOOLEAN,
    CONSTRAINT pk_gudang PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.gudangmapping CASCADE;
CREATE TABLE public.gudangmapping (
    id SERIAL NOT NULL,
    gudang VARCHAR(50),
    company_code VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(255),
    CONSTRAINT pk_gudangmapping PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.gudang_sppt CASCADE;
CREATE TABLE public.gudang_sppt (
    idgud SERIAL NOT NULL,
    id VARCHAR(50) NOT NULL,
    maxantrian INTEGER,
    antrian INTEGER,
    deskripsi VARCHAR(255),
    tibadigudang INTEGER,
    company_code VARCHAR(50),
    CONSTRAINT pk_gudang_sppt PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.inoutgudang CASCADE;
CREATE TABLE public.inoutgudang (
    id SERIAL NOT NULL,
    storage VARCHAR(50),
    product VARCHAR(50),
    stok NUMERIC(18, 3),
    tipe VARCHAR(50),
    keterangan VARCHAR(255),
    updatedby VARCHAR(50),
    updatedon TIMESTAMP(3),
    posto VARCHAR(50),
    tiket VARCHAR(50),
    CONSTRAINT pk_inoutgudang PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.indigoportmaster CASCADE;
CREATE TABLE public.indigoportmaster (
    portid VARCHAR(50) NOT NULL,
    portname VARCHAR(255),
    portlength INTEGER,
    plant VARCHAR(50),
    CONSTRAINT pk_indigoportmaster PRIMARY KEY (portid)
);

DROP TABLE IF EXISTS public.indigoportstatus CASCADE;
CREATE TABLE public.indigoportstatus (
    id BIGSERIAL NOT NULL,
    portid TEXT,
    portname TEXT,
    vesselname TEXT,
    loa NUMERIC(18, 3),
    arrivaltype TEXT,
    equipment TEXT,
    cargo TEXT,
    berthing TIMESTAMP(3),
    start TIMESTAMP(3),
    finish TIMESTAMP(3),
    laytimecommence TIMESTAMP(3),
    esttimecompleted TIMESTAMP(3),
    esttimedeparture TIMESTAMP(3),
    vesseldemurage TIMESTAMP(3),
    ltu TEXT,
    actualrate TEXT,
    effectiveworktime TEXT,
    billoflading TEXT,
    actualcargohandled TEXT,
    cargohandling TEXT,
    vendorpbm TEXT,
    vendoremkl TEXT,
    vendorsurveyor TEXT,
    vendoragency TEXT,
    sandarx INTEGER,
    sandary INTEGER,
    nomorantrian INTEGER,
    planttujuan TEXT,
    hadap TEXT,
    updatedon TIMESTAMP(3),
    updatedby TEXT,
    company VARCHAR(50),
    CONSTRAINT pk_indigoportstatus PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.kuota1header CASCADE;
CREATE TABLE public.kuota1header (
    id SERIAL NOT NULL,
    guid VARCHAR(50),
    tanggal TIMESTAMP(3),
    idproduk VARCHAR(50),
    kuota NUMERIC(18, 3),
    kuota_terpesan NUMERIC(18, 3),
    kuota_in NUMERIC(18, 3),
    kuota_out NUMERIC(18, 3),
    activated VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(128),
    company_code VARCHAR(50),
    plant3 VARCHAR(50),
    CONSTRAINT pk_kuota1header PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.kuota2wilayah CASCADE;
CREATE TABLE public.kuota2wilayah (
    id SERIAL NOT NULL,
    guid VARCHAR(50),
    level1 INTEGER,
    wilayah VARCHAR(50),
    tanggal TIMESTAMP(3),
    idproduk VARCHAR(50),
    kuota NUMERIC(18, 3),
    kuota_terpesan NUMERIC(18, 3),
    kuota_in NUMERIC(18, 3),
    kuota_out NUMERIC(18, 3),
    activated VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(128),
    company_code VARCHAR(50),
    CONSTRAINT pk_kuota2wilayah PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.kuota3bagian CASCADE;
CREATE TABLE public.kuota3bagian (
    id BIGSERIAL NOT NULL,
    guid VARCHAR(50),
    level2 INTEGER,
    bagian VARCHAR(50),
    tanggal TIMESTAMP(3),
    idproduk VARCHAR(50),
    kuota NUMERIC(18, 3),
    kuota_terpesan NUMERIC(18, 3),
    kuota_in NUMERIC(18, 3),
    kuota_out NUMERIC(18, 3),
    activated VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(128),
    company_code VARCHAR(50),
    CONSTRAINT pk_kuota3bagian PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.kuota4shift CASCADE;
CREATE TABLE public.kuota4shift (
    id BIGSERIAL NOT NULL,
    guid VARCHAR(50),
    level3 BIGINT,
    tanggal TIMESTAMP(3),
    shift VARCHAR(50),
    idproduk VARCHAR(50),
    kuota NUMERIC(18, 3),
    kuota_terpesan NUMERIC(18, 3),
    kuota_in NUMERIC(18, 3),
    kuota_out NUMERIC(18, 3),
    activated VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(128),
    startshift TIMESTAMP(3),
    company_code VARCHAR(50),
    CONSTRAINT pk_kuota4shift PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.kuotatemplate CASCADE;
CREATE TABLE public.kuotatemplate (
    id SERIAL NOT NULL,
    scope VARCHAR(50),
    abbrev VARCHAR(50),
    parent VARCHAR(50),
    qty NUMERIC(18, 3),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(50),
    company_code VARCHAR(50),
    product VARCHAR(50),
    CONSTRAINT pk_kuotatemplate PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.kuotatemplatelini CASCADE;
CREATE TABLE public.kuotatemplatelini (
    id SERIAL NOT NULL,
    scope VARCHAR(50),
    abbrev VARCHAR(50),
    parent VARCHAR(50),
    qty INTEGER,
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(255),
    company_code VARCHAR(100),
    product VARCHAR(100),
    gudangtujuan VARCHAR(50),
    starttime TIMESTAMP(3),
    endtime TIMESTAMP(3),
    CONSTRAINT pk_kuotatemplatelini PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.logarmada CASCADE;
CREATE TABLE public.logarmada (
    id BIGSERIAL NOT NULL,
    ticketid BIGINT,
    position VARCHAR(255),
    positioncode VARCHAR(50),
    updatedon TIMESTAMP(3),
    bookingno VARCHAR(50),
    CONSTRAINT pk_logarmada PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.logarmadareview CASCADE;
CREATE TABLE public.logarmadareview (
    id BIGSERIAL NOT NULL,
    idarmadareview BIGINT,
    updatedon TIMESTAMP(3),
    updatedby TEXT,
    status VARCHAR(50),
    transportcode TEXT,
    sumbu VARCHAR(50),
    jeniskendaraan VARCHAR(50),
    qtymax NUMERIC(18, 2),
    kir VARCHAR(255),
    jbi NUMERIC(18, 2),
    beratkendaraan NUMERIC(18, 2),
    beratpenumpang NUMERIC(18, 2),
    nopol VARCHAR(50),
    alasan TEXT,
    CONSTRAINT pk_logarmadareview PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.logbypass CASCADE;
CREATE TABLE public.logbypass (
    id SERIAL NOT NULL,
    bookingcode VARCHAR(50),
    reason VARCHAR(255),
    updatedby VARCHAR(50),
    updatedon TIMESTAMP(3),
    posisi_awal VARCHAR(50),
    posisi_akhir VARCHAR(50),
    CONSTRAINT pk_logbypass PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.logkuota CASCADE;
CREATE TABLE public.logkuota (
    id SERIAL NOT NULL,
    idkuota BIGINT,
    levelkuota VARCHAR(255),
    before NUMERIC(18, 3),
    after NUMERIC(18, 3),
    idproduk VARCHAR(255),
    produk VARCHAR(255),
    scope VARCHAR(255),
    detail TEXT,
    updatedby VARCHAR(255),
    action VARCHAR(255),
    tanggal TIMESTAMP(3),
    updatedon TIMESTAMP(3),
    level1 BIGINT,
    level2 BIGINT,
    level3 BIGINT,
    level4 BIGINT,
    CONSTRAINT pk_logkuota PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.logposto CASCADE;
CREATE TABLE public.logposto (
    id BIGSERIAL NOT NULL,
    noposto VARCHAR(50),
    transport VARCHAR(255),
    deskripsi TEXT,
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(255),
    status VARCHAR(50),
    guid VARCHAR(255),
    asal VARCHAR(50),
    tujuan VARCHAR(50),
    qty NUMERIC(18, 3),
    qtyrencana NUMERIC(18, 3),
    qtyrealisasi NUMERIC(18, 3),
    distributor VARCHAR(255),
    CONSTRAINT pk_logposto PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.logstok CASCADE;
CREATE TABLE public.logstok (
    id SERIAL NOT NULL,
    storage VARCHAR(50),
    product VARCHAR(50),
    stok NUMERIC(18, 3),
    tipe VARCHAR(50),
    keterangan VARCHAR(255),
    updatedby VARCHAR(50),
    updatedon TIMESTAMP(3),
    posto VARCHAR(50),
    bookingno VARCHAR(50),
    company_code VARCHAR(50),
    CONSTRAINT pk_logstok PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.logtriggerpindahgudang CASCADE;
CREATE TABLE public.logtriggerpindahgudang (
    ticketid VARCHAR(255) NOT NULL,
    produkid VARCHAR(255) NOT NULL,
    storageid VARCHAR(255) NOT NULL,
    storageidnew VARCHAR(255) NOT NULL,
    antriangudang_old INTEGER NOT NULL,
    antriangudang_new INTEGER NOT NULL,
    antrianproduk_old INTEGER NOT NULL,
    antrianproduk_new INTEGER NOT NULL,
    updatedby TIMESTAMP(3) NOT NULL
);

DROP TABLE IF EXISTS public.logverifikasi CASCADE;
CREATE TABLE public.logverifikasi (
    id SERIAL NOT NULL,
    bookingno VARCHAR(255) NOT NULL,
    donumber VARCHAR(255),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(255),
    CONSTRAINT pk_logverifikasi PRIMARY KEY (bookingno)
);

DROP TABLE IF EXISTS public.logwa CASCADE;
CREATE TABLE public.logwa (
    id SERIAL NOT NULL,
    keterangan TEXT,
    tipe VARCHAR(250),
    updatedon TIMESTAMP(3),
    updatedby TEXT,
    kode VARCHAR(250),
    CONSTRAINT pk_logwa PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.m_bagian CASCADE;
CREATE TABLE public.m_bagian (
    abbrev VARCHAR(50) NOT NULL,
    keterangan VARCHAR(50),
    scope VARCHAR(50),
    level INTEGER,
    tipe VARCHAR(50),
    company_code VARCHAR(50),
    CONSTRAINT pk_m_bagian PRIMARY KEY (abbrev)
);

DROP TABLE IF EXISTS public.m_bagiandetail CASCADE;
CREATE TABLE public.m_bagiandetail (
    id SERIAL NOT NULL,
    abbrev VARCHAR(50),
    company_code VARCHAR(50),
    keterengan VARCHAR(50),
    scope VARCHAR(50),
    level INTEGER,
    tipe VARCHAR(50),
    CONSTRAINT pk_m_bagiandetail PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.m_gruptruk CASCADE;
CREATE TABLE public.m_gruptruk (
    id INTEGER NOT NULL,
    nama VARCHAR(100) NOT NULL,
    CONSTRAINT pk_m_gruptruk PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.m_percepatan CASCADE;
CREATE TABLE public.m_percepatan (
    kodeplant VARCHAR(10) NOT NULL,
    idgruptruk INTEGER NOT NULL,
    idsumbu INTEGER NOT NULL,
    muatanpercepatan NUMERIC(18, 3) NOT NULL,
    tanggalawal DATE,
    tanggalakhir DATE,
    CONSTRAINT pk_m_percepatan PRIMARY KEY (kodeplant)
);

DROP TABLE IF EXISTS public.m_shift CASCADE;
CREATE TABLE public.m_shift (
    abbrev VARCHAR(50) NOT NULL,
    keterangan VARCHAR(50),
    scope VARCHAR(50),
    level INTEGER,
    starttime TIMESTAMP(3),
    endtime TIMESTAMP(3),
    company_code VARCHAR(50),
    CONSTRAINT pk_m_shift PRIMARY KEY (abbrev)
);

DROP TABLE IF EXISTS public.m_shiftlini CASCADE;
CREATE TABLE public.m_shiftlini (
    abbrev VARCHAR(50) NOT NULL,
    keterangan VARCHAR(50),
    scope VARCHAR(50),
    level INTEGER,
    starttime TIMESTAMP(3),
    endtime TIMESTAMP(3),
    company_code VARCHAR(50),
    tujuan VARCHAR(50),
    CONSTRAINT pk_m_shiftlini PRIMARY KEY (abbrev)
);

DROP TABLE IF EXISTS public.m_status CASCADE;
CREATE TABLE public.m_status (
    abbrev VARCHAR(50) NOT NULL,
    keterangan VARCHAR(255),
    scope VARCHAR(50),
    level INTEGER,
    CONSTRAINT pk_m_status PRIMARY KEY (abbrev)
);

DROP TABLE IF EXISTS public.m_wilayah CASCADE;
CREATE TABLE public.m_wilayah (
    abbrev VARCHAR(50) NOT NULL,
    keterangan VARCHAR(50),
    scope VARCHAR(50),
    level INTEGER,
    truk BOOLEAN,
    container BOOLEAN,
    roles VARCHAR(50),
    CONSTRAINT pk_m_wilayah PRIMARY KEY (abbrev)
);

DROP TABLE IF EXISTS public.m_wilayahdetail CASCADE;
CREATE TABLE public.m_wilayahdetail (
    id SERIAL NOT NULL,
    abbrev VARCHAR(50) NOT NULL,
    company_code VARCHAR(50),
    keterangan VARCHAR(50),
    level INTEGER,
    scope VARCHAR(50),
    CONSTRAINT pk_m_wilayahdetail PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.mappinggudangbypassodol CASCADE;
CREATE TABLE public.mappinggudangbypassodol (
    id SERIAL NOT NULL,
    asal VARCHAR(50),
    tujuan VARCHAR(50),
    odol VARCHAR(50),
    startdatetime TIMESTAMP(3),
    enddatetime TIMESTAMP(3),
    CONSTRAINT pk_mappinggudangbypassodol PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.mappinggudangzeroodol CASCADE;
CREATE TABLE public.mappinggudangzeroodol (
    id SERIAL NOT NULL,
    companycode VARCHAR(50),
    tujuan VARCHAR(50),
    odol VARCHAR(50),
    startdatetime TIMESTAMP(3),
    enddatetime TIMESTAMP(3),
    CONSTRAINT pk_mappinggudangzeroodol PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.mappingprodukgudang CASCADE;
CREATE TABLE public.mappingprodukgudang (
    id SERIAL NOT NULL,
    produk VARCHAR(50),
    gudang VARCHAR(50),
    stock NUMERIC(18, 3),
    kapasitas NUMERIC(18, 3),
    kuotaantrian NUMERIC(18, 2),
    antrian NUMERIC(18, 0),
    aktif BOOLEAN,
    priority INTEGER,
    CONSTRAINT pk_mappingprodukgudang PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.mappingusergudang CASCADE;
CREATE TABLE public.mappingusergudang (
    id SERIAL NOT NULL,
    username VARCHAR(128),
    gudang VARCHAR(50),
    CONSTRAINT pk_mappingusergudang PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.mst_shift CASCADE;
CREATE TABLE public.mst_shift (
    id SERIAL NOT NULL,
    shift VARCHAR(50),
    starttime TIMESTAMP(3),
    endtime TIMESTAMP(3),
    company_code VARCHAR(50),
    CONSTRAINT pk_mst_shift PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.mst_standard CASCADE;
CREATE TABLE public.mst_standard (
    id SERIAL NOT NULL,
    posisi VARCHAR(50),
    timing BIGINT,
    CONSTRAINT pk_mst_standard PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.mst_alasan CASCADE;
CREATE TABLE public.mst_alasan (
    id SERIAL NOT NULL,
    action VARCHAR(50),
    alasan VARCHAR(255),
    denda NUMERIC(18, 3),
    CONSTRAINT pk_mst_alasan PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.posto CASCADE;
CREATE TABLE public.posto (
    id BIGSERIAL NOT NULL,
    guid VARCHAR(50) NOT NULL,
    noposto VARCHAR(50) NOT NULL,
    deleted VARCHAR(50),
    tglposto TIMESTAMP(3),
    asal VARCHAR(50),
    tujuan VARCHAR(50),
    transport VARCHAR(255),
    produk VARCHAR(50),
    qty NUMERIC(18, 3),
    status VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(128),
    uploadcode VARCHAR(255),
    tglakhir TIMESTAMP(3),
    qtyrencana NUMERIC(18, 3),
    qtyrealisasi NUMERIC(18, 3),
    pallet VARCHAR(1),
    cutoff VARCHAR(1),
    wilayah VARCHAR(50),
    bagian VARCHAR(50),
    selisihcutoff NUMERIC(18, 3),
    kapal VARCHAR(255),
    company_code VARCHAR(50),
    tipe VARCHAR(50),
    kotatujuan VARCHAR(255),
    initialqty NUMERIC(18, 3),
    tgljatuhtempo TIMESTAMP(3),
    charter VARCHAR(50),
    distributor VARCHAR(255),
    percepatan VARCHAR(10),
    idgruptruk INTEGER,
    muatanpercepatan NUMERIC(18, 3),
    CONSTRAINT pk_posto PRIMARY KEY (noposto)
);

DROP TABLE IF EXISTS public.posto_cutoff CASCADE;
CREATE TABLE public.posto_cutoff (
    id SERIAL NOT NULL,
    noposto VARCHAR(50) NOT NULL,
    sisa NUMERIC(18, 3),
    alasan VARCHAR(50),
    denda NUMERIC(18, 3),
    staffarea VARCHAR(50),
    updatedby VARCHAR(50),
    updatedon TIMESTAMP(3),
    CONSTRAINT pk_posto_cutoff PRIMARY KEY (noposto)
);

DROP TABLE IF EXISTS public.posto_cutoff_upload CASCADE;
CREATE TABLE public.posto_cutoff_upload (
    noposto VARCHAR(50) NOT NULL,
    qty NUMERIC(18, 3),
    uploadcode VARCHAR(255),
    CONSTRAINT pk_posto_cutoff_upload PRIMARY KEY (noposto)
);

DROP TABLE IF EXISTS public.posto_deleted CASCADE;
CREATE TABLE public.posto_deleted (
    id BIGSERIAL NOT NULL,
    guid VARCHAR(50),
    noposto VARCHAR(50) NOT NULL,
    tglposto TIMESTAMP(3),
    asal VARCHAR(50),
    tujuan VARCHAR(50),
    transport VARCHAR(255),
    produk VARCHAR(50),
    qty NUMERIC(18, 3),
    status VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(50),
    uploadcode VARCHAR(255),
    tglakhir TIMESTAMP(3),
    qtyrencana NUMERIC(18, 3),
    qtyrealisasi NUMERIC(18, 3),
    pallet VARCHAR(1),
    cutoff VARCHAR(1),
    wilayah VARCHAR(50),
    bagian VARCHAR(50),
    CONSTRAINT pk_posto_deleted PRIMARY KEY (noposto)
);

DROP TABLE IF EXISTS public.posto_deleted_alasan CASCADE;
CREATE TABLE public.posto_deleted_alasan (
    id SERIAL NOT NULL,
    noposto VARCHAR(50),
    alasan VARCHAR(255),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(50),
    CONSTRAINT pk_posto_deleted_alasan PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.posto_upload CASCADE;
CREATE TABLE public.posto_upload (
    id BIGSERIAL NOT NULL,
    noposto VARCHAR(255) NOT NULL,
    tglposto TIMESTAMP(3),
    asal VARCHAR(50),
    tujuan VARCHAR(50),
    transport VARCHAR(255),
    produk VARCHAR(50),
    qty NUMERIC(18, 3),
    status VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(50),
    uploadcode VARCHAR(255),
    tglakhir TIMESTAMP(3),
    wilayah VARCHAR(50),
    bagian VARCHAR(50),
    kapal VARCHAR(50),
    kotatujuan VARCHAR(50),
    CONSTRAINT pk_posto_upload PRIMARY KEY (noposto)
);

DROP TABLE IF EXISTS public.produk CASCADE;
CREATE TABLE public.produk (
    id VARCHAR(50) NOT NULL,
    nama VARCHAR(100),
    kode VARCHAR(100),
    denda NUMERIC(18, 3),
    pkg BOOLEAN,
    log4meneng BOOLEAN,
    romo BOOLEAN,
    d243 BOOLEAN,
    pkc BOOLEAN,
    cilacap BOOLEAN,
    medan BOOLEAN,
    pim BOOLEAN,
    f207 BOOLEAN,
    b205 BOOLEAN,
    f249 BOOLEAN,
    lombok BOOLEAN,
    makasar2 BOOLEAN,
    banjarmasin2 BOOLEAN,
    f257 BOOLEAN,
    tipe VARCHAR(50),
    CONSTRAINT pk_produk PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.produklini CASCADE;
CREATE TABLE public.produklini (
    id VARCHAR(50) NOT NULL,
    nama VARCHAR(100),
    kode VARCHAR(100),
    denda NUMERIC(18, 3),
    tujuan VARCHAR(50),
    CONSTRAINT pk_produklini PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.produkmapping CASCADE;
CREATE TABLE public.produkmapping (
    id SERIAL NOT NULL,
    produk VARCHAR(50),
    company_code VARCHAR(50),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(255),
    CONSTRAINT pk_produkmapping PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.rpt_nopol CASCADE;
CREATE TABLE public.rpt_nopol (
    id SERIAL NOT NULL,
    transportcode VARCHAR(50),
    transport TEXT,
    nopol VARCHAR(50),
    qty NUMERIC(18, 0),
    updatedon TIMESTAMP(3),
    CONSTRAINT pk_rpt_nopol PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.rpt_nopol_double CASCADE;
CREATE TABLE public.rpt_nopol_double (
    id SERIAL NOT NULL,
    nopol VARCHAR(50),
    qty NUMERIC(18, 0),
    updatedon TIMESTAMP(3),
    CONSTRAINT pk_rpt_nopol_double PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.signature CASCADE;
CREATE TABLE public.signature (
    id SERIAL NOT NULL,
    files TEXT,
    nama TEXT,
    jabatan TEXT,
    company_code VARCHAR(50),
    CONSTRAINT pk_signature PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.signature_company CASCADE;
CREATE TABLE public.signature_company (
    id SERIAL NOT NULL,
    inisial VARCHAR(3),
    nama_company TEXT,
    CONSTRAINT pk_signature_company PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.sumbu CASCADE;
CREATE TABLE public.sumbu (
    id SERIAL NOT NULL,
    jenistruk VARCHAR(255),
    nama VARCHAR(255),
    tahun VARCHAR(255),
    muatan NUMERIC(18, 3),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(100),
    idgruptruk INTEGER NOT NULL,
    CONSTRAINT pk_sumbu PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.ticket_request_delete CASCADE;
CREATE TABLE public.ticket_request_delete (
    id SERIAL NOT NULL,
    bookingcode VARCHAR(50),
    reason VARCHAR(255),
    reasonapprove VARCHAR(255),
    denda NUMERIC(18, 3),
    requestdate TIMESTAMP(3),
    requester VARCHAR(50),
    approve VARCHAR(50),
    approvedate TIMESTAMP(3),
    staffarea VARCHAR(50),
    statusreq VARCHAR(50),
    area VARCHAR(50),
    CONSTRAINT pk_ticket_request_delete PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.ticket_request_reschedule CASCADE;
CREATE TABLE public.ticket_request_reschedule (
    id SERIAL NOT NULL,
    bookingcode VARCHAR(50),
    reason VARCHAR(255),
    reasonapprove VARCHAR(255),
    denda NUMERIC(18, 3),
    periodeasal BIGINT,
    periodewil BIGINT,
    periodewilapprove BIGINT,
    requestdate TIMESTAMP(3),
    requester VARCHAR(50),
    approve VARCHAR(50),
    approvedate TIMESTAMP(3),
    staffarea VARCHAR(50),
    statusreq VARCHAR(50),
    area VARCHAR(50),
    CONSTRAINT pk_ticket_request_reschedule PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.tiket CASCADE;
CREATE TABLE public.tiket (
    id BIGSERIAL NOT NULL,
    bookingno VARCHAR(50) NOT NULL,
    tiketno VARCHAR(50),
    posto VARCHAR(50),
    tanggal TIMESTAMP(3),
    idshift BIGINT,
    idtransport VARCHAR(255),
    idproduk VARCHAR(50),
    nopol VARCHAR(50),
    driver VARCHAR(50),
    qty NUMERIC(18, 3),
    statuspemuatan VARCHAR(50),
    position VARCHAR(50),
    updatedon TIMESTAMP(3),
    timesec TIMESTAMP(3),
    timekosong TIMESTAMP(3),
    timegudang TIMESTAMP(3),
    timemuat TIMESTAMP(3),
    timeisi TIMESTAMP(3),
    timeout TIMESTAMP(3),
    timepelabuhan TIMESTAMP(3),
    updatedby VARCHAR(50),
    revised VARCHAR(1),
    validsecurity INTEGER,
    validisi INTEGER,
    emergencystatus VARCHAR(1),
    statusticket VARCHAR(50),
    holdreason VARCHAR(255),
    deletereason VARCHAR(255),
    pic VARCHAR(50),
    tanggalshift TIMESTAMP(3),
    nomor_antrian INTEGER,
    label_antrian VARCHAR(255),
    donumber VARCHAR(50),
    timesec3 TIMESTAMP(3),
    timebongkar TIMESTAMP(3),
    timeendbongkar TIMESTAMP(3),
    timeout3 TIMESTAMP(3),
    plant3 VARCHAR(50),
    timereturn TIMESTAMP(3),
    CONSTRAINT pk_tiket PRIMARY KEY (bookingno)
);

DROP TABLE IF EXISTS public.tiketperubahan CASCADE;
CREATE TABLE public.tiketperubahan (
    id SERIAL NOT NULL,
    bookingno VARCHAR(50),
    before VARCHAR(255),
    after VARCHAR(255),
    detail TEXT,
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(50),
    alasan VARCHAR(255),
    CONSTRAINT pk_tiketperubahan PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.tiket_deleted_alasan CASCADE;
CREATE TABLE public.tiket_deleted_alasan (
    id SERIAL NOT NULL,
    bookingno VARCHAR(50),
    alasan INTEGER,
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(50),
    reason VARCHAR(255),
    denda NUMERIC(18, 0),
    CONSTRAINT pk_tiket_deleted_alasan PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.tiket_history CASCADE;
CREATE TABLE public.tiket_history (
    id BIGSERIAL NOT NULL,
    bookingno VARCHAR(50) NOT NULL,
    tiketno VARCHAR(50),
    posto VARCHAR(50),
    tanggal TIMESTAMP(3),
    idshift BIGINT,
    idtransport VARCHAR(255),
    idproduk VARCHAR(50),
    nopol VARCHAR(50),
    driver VARCHAR(50),
    qty NUMERIC(18, 3),
    statuspemuatan VARCHAR(50),
    position VARCHAR(50),
    updatedon TIMESTAMP(3),
    timesec TIMESTAMP(3),
    timekosong TIMESTAMP(3),
    timegudang TIMESTAMP(3),
    timemuat TIMESTAMP(3),
    timeisi TIMESTAMP(3),
    timeout TIMESTAMP(3),
    updatedby VARCHAR(50),
    revised VARCHAR(1),
    validsecurity INTEGER,
    validisi INTEGER,
    emergencystatus VARCHAR(1),
    statusticket VARCHAR(50),
    holdreason VARCHAR(255),
    deletereason VARCHAR(255),
    pic VARCHAR(50),
    postodeleted VARCHAR(50),
    CONSTRAINT pk_tiket_history PRIMARY KEY (bookingno)
);

DROP TABLE IF EXISTS public.tiket_reschedule_alasan CASCADE;
CREATE TABLE public.tiket_reschedule_alasan (
    id SERIAL NOT NULL,
    bookingno VARCHAR(50),
    alasan VARCHAR(255),
    updatedon TIMESTAMP(3),
    updatedby VARCHAR(50),
    CONSTRAINT pk_tiket_reschedule_alasan PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.transport CASCADE;
CREATE TABLE public.transport (
    id BIGSERIAL NOT NULL,
    username VARCHAR(50),
    kode VARCHAR(255) NOT NULL,
    nama VARCHAR(255),
    singkatan VARCHAR(50),
    email VARCHAR(50),
    ischarter BOOLEAN,
    startcharter TIMESTAMP(3),
    endcharter TIMESTAMP(3),
    alamat TEXT,
    CONSTRAINT pk_transport PRIMARY KEY (kode)
);

DROP TABLE IF EXISTS public.userlogs CASCADE;
CREATE TABLE public.userlogs (
    logid SERIAL NOT NULL,
    timestamp TIMESTAMP(3) NOT NULL,
    loglevel VARCHAR(10),
    username VARCHAR(100),
    activity TEXT,
    ipaddress VARCHAR(50),
    controller VARCHAR(100),
    action VARCHAR(100),
    browser TEXT,
    lastlogin TIMESTAMP(3),
    CONSTRAINT pk_userlogs PRIMARY KEY (logid)
);

DROP TABLE IF EXISTS public.__efmigrationshistory CASCADE;
CREATE TABLE public.__efmigrationshistory (
    migrationid VARCHAR(150) NOT NULL,
    productversion VARCHAR(32) NOT NULL,
    CONSTRAINT pk___efmigrationshistory PRIMARY KEY (migrationid)
);

DROP TABLE IF EXISTS public.__migrationhistory CASCADE;
CREATE TABLE public.__migrationhistory (
    migrationid VARCHAR(150) NOT NULL,
    contextkey VARCHAR(300) NOT NULL,
    model BYTEA NOT NULL,
    productversion VARCHAR(128)
);

DROP TABLE IF EXISTS public.datatiket2 CASCADE;
CREATE TABLE public.datatiket2 (
    id BIGINT NOT NULL,
    bookingno VARCHAR(50) NOT NULL,
    tiketno VARCHAR(50),
    posto VARCHAR(50),
    tanggal TIMESTAMP(3),
    idshift BIGINT,
    idtransport VARCHAR(255),
    idproduk VARCHAR(50),
    nopol VARCHAR(50),
    driver VARCHAR(50),
    qty NUMERIC(18, 3),
    statuspemuatan VARCHAR(50),
    position VARCHAR(50),
    updatedon TIMESTAMP(3),
    timesec TIMESTAMP(3),
    timekosong TIMESTAMP(3),
    timegudang TIMESTAMP(3),
    timemuat TIMESTAMP(3),
    timeisi TIMESTAMP(3),
    timeout TIMESTAMP(3),
    updatedby VARCHAR(50),
    revised VARCHAR(1),
    validsecurity INTEGER,
    validisi INTEGER,
    emergencystatus VARCHAR(1),
    statusticket VARCHAR(50),
    holdreason VARCHAR(255),
    deletereason VARCHAR(255),
    pic VARCHAR(50),
    codeshift VARCHAR(50),
    tanggalshift TIMESTAMP(3),
    shift VARCHAR(50),
    posisi VARCHAR(255),
    statustiket VARCHAR(255),
    tglposto TIMESTAMP(3),
    asal VARCHAR(50),
    tujuan VARCHAR(50),
    qtyposto NUMERIC(18, 3),
    namaproduk VARCHAR(100),
    namatransportir VARCHAR(255),
    gudangasal VARCHAR(200),
    gudangtujuan VARCHAR(200),
    date_sent TIMESTAMP(3)
);

DROP TABLE IF EXISTS public.failed_jobs CASCADE;
CREATE TABLE public.failed_jobs (
    id BIGSERIAL NOT NULL,
    uuid VARCHAR(255) NOT NULL,
    connection TEXT NOT NULL,
    queue TEXT NOT NULL,
    payload TEXT NOT NULL,
    exception TEXT NOT NULL,
    failed_at TIMESTAMP(3) NOT NULL
);

DROP TABLE IF EXISTS public.migrations CASCADE;
CREATE TABLE public.migrations (
    id SERIAL NOT NULL,
    migration VARCHAR(255) NOT NULL,
    batch INTEGER NOT NULL
);

DROP TABLE IF EXISTS public.password_resets CASCADE;
CREATE TABLE public.password_resets (
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP(3)
);

DROP TABLE IF EXISTS public.personal_access_tokens CASCADE;
CREATE TABLE public.personal_access_tokens (
    id BIGSERIAL NOT NULL,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL,
    abilities TEXT,
    last_used_at TIMESTAMP(3),
    created_at TIMESTAMP(3),
    updated_at TIMESTAMP(3)
);

DROP TABLE IF EXISTS public.triggerlog CASCADE;
CREATE TABLE public.triggerlog (
    id SERIAL NOT NULL,
    updatedon TIMESTAMP(3),
    bookingno VARCHAR(50),
    position VARCHAR(50),
    switch VARCHAR(50),
    posto VARCHAR(50),
    qty NUMERIC(18, 3),
    storageid VARCHAR(50),
    idproduk VARCHAR(50),
    idshift VARCHAR(50),
    tibadigudang NUMERIC(18, 3),
    CONSTRAINT pk_triggerlog PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    id BIGSERIAL NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP(3),
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100),
    created_at TIMESTAMP(3),
    updated_at TIMESTAMP(3)
);

-- WTC Schema tables
DROP TABLE IF EXISTS wtc.logsanggahan CASCADE;
CREATE TABLE wtc.logsanggahan (
    id BIGSERIAL NOT NULL,
    idsanggahan BIGINT NOT NULL,
    bookingno VARCHAR(50) NOT NULL,
    kodeekspeditur VARCHAR(255) NOT NULL,
    realisasiwtc NUMERIC(4, 2) NOT NULL,
    penyebabketerlambatan TEXT,
    evidence TEXT,
    hasilevaluasi BIGINT,
    keteranganditolak TEXT,
    penyesuaianwtc NUMERIC(4, 2),
    penyesuaianwtcdate TIMESTAMP(3),
    approver VARCHAR(100),
    approvertitle VARCHAR(100),
    approvedat TIMESTAMP(3),
    createdat TIMESTAMP(3),
    createdby VARCHAR(128),
    updatedat TIMESTAMP(3),
    updatedby VARCHAR(128),
    evidencepod TEXT,
    statustemp BIGINT,
    CONSTRAINT pk_logsanggahan PRIMARY KEY (id)
);

DROP TABLE IF EXISTS wtc.regional CASCADE;
CREATE TABLE wtc.regional (
    id VARCHAR(20) NOT NULL,
    deskripsi VARCHAR(100) NOT NULL,
    companycode VARCHAR(50) NOT NULL,
    approver VARCHAR(100) NOT NULL,
    approvertitle VARCHAR(100) NOT NULL,
    createdat TIMESTAMP(3),
    createdby VARCHAR(128),
    updatedat TIMESTAMP(3),
    updatedby VARCHAR(128),
    CONSTRAINT pk_regional PRIMARY KEY (id)
);

DROP TABLE IF EXISTS wtc.regionaltruk CASCADE;
CREATE TABLE wtc.regionaltruk (
    idregional VARCHAR(20) NOT NULL,
    idjenistruk INTEGER NOT NULL,
    jumlahunit INTEGER NOT NULL,
    hargasatuan NUMERIC(12, 2) NOT NULL,
    createdat TIMESTAMP(3),
    createdby VARCHAR(128),
    updatedat TIMESTAMP(3),
    updatedby VARCHAR(128),
    CONSTRAINT pk_regionaltruk PRIMARY KEY (idregional)
);

DROP TABLE IF EXISTS wtc.rute CASCADE;
CREATE TABLE wtc.rute (
    id BIGSERIAL NOT NULL,
    idregional VARCHAR(20) NOT NULL,
    gudangasal VARCHAR(100) NOT NULL,
    gudangtujuan VARCHAR(100) NOT NULL,
    jaraktempuh NUMERIC(12, 2) NOT NULL,
    wtc NUMERIC(4, 2) NOT NULL,
    turnaround INTEGER NOT NULL,
    createdat TIMESTAMP(3),
    createdby VARCHAR(128),
    updatedat TIMESTAMP(3),
    updatedby VARCHAR(128),
    CONSTRAINT pk_rute PRIMARY KEY (id)
);

DROP TABLE IF EXISTS wtc.ruteplant CASCADE;
CREATE TABLE wtc.ruteplant (
    ruteid BIGINT NOT NULL,
    plantasal VARCHAR(50) NOT NULL,
    planttujuan VARCHAR(50) NOT NULL,
    createdat TIMESTAMP(3),
    createdby VARCHAR(128),
    updatedat TIMESTAMP(3),
    updatedby VARCHAR(128),
    CONSTRAINT pk_ruteplant PRIMARY KEY (ruteid)
);

DROP TABLE IF EXISTS wtc.rutetruk CASCADE;
CREATE TABLE wtc.rutetruk (
    ruteid BIGINT NOT NULL,
    idjenistruk INTEGER NOT NULL,
    hargasatuan NUMERIC(12, 2) NOT NULL,
    createdat TIMESTAMP(3),
    createdby VARCHAR(128),
    updatedat TIMESTAMP(3),
    updatedby VARCHAR(128),
    CONSTRAINT pk_rutetruk PRIMARY KEY (ruteid)
);

DROP TABLE IF EXISTS wtc.sanggahan CASCADE;
CREATE TABLE wtc.sanggahan (
    id BIGSERIAL NOT NULL,
    bookingno VARCHAR(50) NOT NULL,
    kodeekspeditur VARCHAR(255) NOT NULL,
    realisasiwtc NUMERIC(4, 2) NOT NULL,
    penyebabketerlambatan TEXT,
    evidence TEXT,
    hasilevaluasi BIGINT,
    keteranganditolak TEXT,
    penyesuaianwtc NUMERIC(4, 2),
    penyesuaianwtcdate TIMESTAMP(3),
    approver VARCHAR(100),
    approvertitle VARCHAR(100),
    approvedat TIMESTAMP(3),
    createdat TIMESTAMP(3),
    createdby VARCHAR(128),
    updatedat TIMESTAMP(3),
    updatedby VARCHAR(128),
    CONSTRAINT pk_sanggahan PRIMARY KEY (id)
);


-- ============================================================
-- INDEXES (FIXED - removed all SQL Server "]" bracket syntax)
-- ============================================================

CREATE INDEX IF NOT EXISTS antrian_id ON public.antrian (id);
CREATE INDEX IF NOT EXISTS antrian_status ON public.antrian (status);
CREATE INDEX IF NOT EXISTS antrian_status_updatedon ON public.antrian (status, updatedon);
CREATE INDEX IF NOT EXISTS armadamapping_company_code ON public.armadamapping (company_code);
CREATE UNIQUE INDEX IF NOT EXISTS rolenameindex ON public.aspnetroles (name);
CREATE INDEX IF NOT EXISTS ix_userid ON public.aspnetuserclaims (userid);
CREATE INDEX IF NOT EXISTS ix_aspnetuserlogins_userid ON public.aspnetuserlogins (userid);
CREATE INDEX IF NOT EXISTS ix_roleid ON public.aspnetuserroles (roleid);
CREATE INDEX IF NOT EXISTS ix_aspnetuserroles_userid ON public.aspnetuserroles (userid);
CREATE UNIQUE INDEX IF NOT EXISTS usernameindex ON public.aspnetusers (username);
CREATE UNIQUE INDEX IF NOT EXISTS failed_jobs_uuid_unique ON public.failed_jobs (uuid);
CREATE INDEX IF NOT EXISTS kuota4shift_company_code ON public.kuota4shift (company_code);
CREATE INDEX IF NOT EXISTS logarmada_bookingno ON public.logarmada (bookingno);
CREATE INDEX IF NOT EXISTS logarmada_bookingno_positioncode ON public.logarmada (bookingno, positioncode);
CREATE INDEX IF NOT EXISTS logarmada_positioncode_bookingno ON public.logarmada (positioncode, bookingno);
CREATE INDEX IF NOT EXISTS password_resets_email_index ON public.password_resets (email);
CREATE UNIQUE INDEX IF NOT EXISTS personal_access_tokens_token_unique ON public.personal_access_tokens (token);
CREATE INDEX IF NOT EXISTS personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens (tokenable_type, tokenable_id);
CREATE INDEX IF NOT EXISTS idx_posto_noposto_companycode ON public.posto (noposto, company_code);
CREATE INDEX IF NOT EXISTS posto_company_code ON public.posto (company_code);
CREATE INDEX IF NOT EXISTS idx_tiket_updatedby_posto_position ON public.tiket (updatedby, posto, position);
CREATE INDEX IF NOT EXISTS idx_tiket_updatedby_posto_position_updatedon ON public.tiket (updatedby, posto, position) INCLUDE (updatedon);
CREATE INDEX IF NOT EXISTS tiket_idshift ON public.tiket (idshift);
CREATE INDEX IF NOT EXISTS tiket_posto ON public.tiket (posto);
CREATE INDEX IF NOT EXISTS tiket_tiketno ON public.tiket (tiketno);
CREATE INDEX IF NOT EXISTS ix_userlogs_timestamp ON public.userlogs (timestamp);
CREATE INDEX IF NOT EXISTS ix_userlogs_username ON public.userlogs (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON public.users (email);

-- ============================================================
-- ADDITIONAL OPTIMIZED INDEXES (FIXED column names)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tiket_tanggal ON public.tiket (tanggal);
CREATE INDEX IF NOT EXISTS idx_tiket_statuspemuatan_tanggal ON public.tiket (statuspemuatan, tanggal)
    INCLUDE (bookingno, nopol, driver, idtransport, posto);
CREATE INDEX IF NOT EXISTS idx_tiket_nopol_tanggal ON public.tiket (nopol, tanggal)
    INCLUDE (bookingno, statuspemuatan, position);
CREATE INDEX IF NOT EXISTS idx_tiket_statusticket_tanggal ON public.tiket (statusticket, tanggal);

-- Posto indexes
CREATE INDEX IF NOT EXISTS idx_posto_tglposto_status ON public.posto (tglposto, status)
    INCLUDE (noposto, asal, tujuan, produk, qty, company_code);
CREATE INDEX IF NOT EXISTS idx_posto_wilayah_bagian ON public.posto (wilayah, bagian, company_code);

-- Kuota indexes
CREATE INDEX IF NOT EXISTS idx_kuota4shift_tanggal_produk ON public.kuota4shift (tanggal, idproduk, company_code)
    INCLUDE (kuota, kuota_terpesan, kuota_in, kuota_out, shift);
CREATE INDEX IF NOT EXISTS idx_kuota3_level2_tanggal ON public.kuota3bagian (level2, tanggal, idproduk);
CREATE INDEX IF NOT EXISTS idx_kuota2_level1_tanggal ON public.kuota2wilayah (level1, tanggal, idproduk);

-- Antrian: storageid lookup
CREATE INDEX IF NOT EXISTS idx_antrian_storageid_status ON public.antrian (storageid, status)
    INCLUDE (ticketid, updatedon);

-- Armada: nopol search (fixed: status_armada not status)
CREATE INDEX IF NOT EXISTS idx_armada_nopol ON public.armada (nopol)
    INCLUDE (transportcode, status_armada);

-- LogArmada: updatedon for log queries (fixed: no tanggal column, use updatedon)
CREATE INDEX IF NOT EXISTS idx_logarmada_updatedon ON public.logarmada (updatedon, bookingno);

-- UserLogs composite
CREATE INDEX IF NOT EXISTS idx_userlogs_user_action_time ON public.userlogs (username, action, timestamp);

-- Delivery_order: filter by tanggaldo (fixed: no tanggal/status column)
CREATE INDEX IF NOT EXISTS idx_do_tanggaldo_company ON public.delivery_order (tanggaldo, company_code)
    INCLUDE (number, transporter);

-- Tiket_History: bookingno + updatedon
CREATE INDEX IF NOT EXISTS idx_tikethistory_bookingno ON public.tiket_history (bookingno, updatedon);

-- InOutGudang: date-based tracking (fixed: use storage+updatedon, no tanggal/gudang column)
CREATE INDEX IF NOT EXISTS idx_inoutgudang_storage_updatedon ON public.inoutgudang (storage, updatedon);


-- ============================================================
-- FOREIGN KEY CONSTRAINTS (VALID ONLY)
-- Removed: 22 constraints referencing non-existent columns
-- ============================================================

-- antrian → gudang_sppt
ALTER TABLE public.antrian
    ADD CONSTRAINT fk_antrian_storageid
    FOREIGN KEY (storageid) REFERENCES public.gudang_sppt (id);

-- antrian → tiket
ALTER TABLE public.antrian
    ADD CONSTRAINT fk_antrian_ticketid
    FOREIGN KEY (ticketid) REFERENCES public.tiket (bookingno)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- aspnetuserclaims → aspnetusers
ALTER TABLE public.aspnetuserclaims
    ADD CONSTRAINT fk_aspnetuserclaims_userid
    FOREIGN KEY (userid) REFERENCES public.aspnetusers (id)
    ON DELETE CASCADE;

-- aspnetuserroles → aspnetusers
ALTER TABLE public.aspnetuserroles
    ADD CONSTRAINT fk_aspnetuserroles_userid
    FOREIGN KEY (userid) REFERENCES public.aspnetusers (id)
    ON DELETE CASCADE;

-- inoutgudang → produk
ALTER TABLE public.inoutgudang
    ADD CONSTRAINT fk_inoutgudang_product
    FOREIGN KEY (product) REFERENCES public.produk (id);

-- kuota1header → gudang
ALTER TABLE public.kuota1header
    ADD CONSTRAINT fk_kuota1header_plant3
    FOREIGN KEY (plant3) REFERENCES public.gudang (id);

-- kuota1header → m_status
ALTER TABLE public.kuota1header
    ADD CONSTRAINT fk_kuota1header_activated
    FOREIGN KEY (activated) REFERENCES public.m_status (abbrev);

-- kuota1header → produk
ALTER TABLE public.kuota1header
    ADD CONSTRAINT fk_kuota1header_idproduk
    FOREIGN KEY (idproduk) REFERENCES public.produk (id);

-- kuota2wilayah → kuota1header
ALTER TABLE public.kuota2wilayah
    ADD CONSTRAINT fk_kuota2wilayah_level1
    FOREIGN KEY (level1) REFERENCES public.kuota1header (id);

-- kuota2wilayah → m_status
ALTER TABLE public.kuota2wilayah
    ADD CONSTRAINT fk_kuota2wilayah_activated
    FOREIGN KEY (activated) REFERENCES public.m_status (abbrev);

-- kuota2wilayah → m_wilayah
ALTER TABLE public.kuota2wilayah
    ADD CONSTRAINT fk_kuota2wilayah_wilayah
    FOREIGN KEY (wilayah) REFERENCES public.m_wilayah (abbrev);

-- kuota2wilayah → produk
ALTER TABLE public.kuota2wilayah
    ADD CONSTRAINT fk_kuota2wilayah_idproduk
    FOREIGN KEY (idproduk) REFERENCES public.produk (id);

-- kuota3bagian → kuota2wilayah
ALTER TABLE public.kuota3bagian
    ADD CONSTRAINT fk_kuota3bagian_level2
    FOREIGN KEY (level2) REFERENCES public.kuota2wilayah (id);

-- kuota3bagian → m_bagian
ALTER TABLE public.kuota3bagian
    ADD CONSTRAINT fk_kuota3bagian_bagian
    FOREIGN KEY (bagian) REFERENCES public.m_bagian (abbrev);

-- kuota3bagian → m_status
ALTER TABLE public.kuota3bagian
    ADD CONSTRAINT fk_kuota3bagian_activated
    FOREIGN KEY (activated) REFERENCES public.m_status (abbrev);

-- kuota3bagian → produk
ALTER TABLE public.kuota3bagian
    ADD CONSTRAINT fk_kuota3bagian_idproduk
    FOREIGN KEY (idproduk) REFERENCES public.produk (id);

-- kuota4shift → kuota3bagian
ALTER TABLE public.kuota4shift
    ADD CONSTRAINT fk_kuota4shift_level3
    FOREIGN KEY (level3) REFERENCES public.kuota3bagian (id);

-- kuota4shift → m_status
ALTER TABLE public.kuota4shift
    ADD CONSTRAINT fk_kuota4shift_activated
    FOREIGN KEY (activated) REFERENCES public.m_status (abbrev);

-- kuota4shift → produk
ALTER TABLE public.kuota4shift
    ADD CONSTRAINT fk_kuota4shift_idproduk
    FOREIGN KEY (idproduk) REFERENCES public.produk (id);

-- logposto → gudang
ALTER TABLE public.logposto
    ADD CONSTRAINT fk_logposto_tujuan
    FOREIGN KEY (tujuan) REFERENCES public.gudang (id);

-- logposto → posto
ALTER TABLE public.logposto
    ADD CONSTRAINT fk_logposto_noposto
    FOREIGN KEY (noposto) REFERENCES public.posto (noposto)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- m_bagiandetail → m_wilayah (scope as wilayah ref)
ALTER TABLE public.m_bagiandetail
    ADD CONSTRAINT fk_m_bagiandetail_scope
    FOREIGN KEY (scope) REFERENCES public.m_wilayah (abbrev);

-- mappingprodukgudang → produk
ALTER TABLE public.mappingprodukgudang
    ADD CONSTRAINT fk_mappingprodukgudang_produk
    FOREIGN KEY (produk) REFERENCES public.produk (id);

-- mappingusergudang → gudang_sppt
ALTER TABLE public.mappingusergudang
    ADD CONSTRAINT fk_mappingusergudang_gudang
    FOREIGN KEY (gudang) REFERENCES public.gudang_sppt (id);

-- posto → company
ALTER TABLE public.posto
    ADD CONSTRAINT fk_posto_company_code
    FOREIGN KEY (company_code) REFERENCES public.company (company_code);

-- posto → gudang (asal)
ALTER TABLE public.posto
    ADD CONSTRAINT fk_posto_asal
    FOREIGN KEY (asal) REFERENCES public.gudang (id);

-- posto → gudang (tujuan)
ALTER TABLE public.posto
    ADD CONSTRAINT fk_posto_tujuan
    FOREIGN KEY (tujuan) REFERENCES public.gudang (id);

-- posto → m_bagian
ALTER TABLE public.posto
    ADD CONSTRAINT fk_posto_bagian
    FOREIGN KEY (bagian) REFERENCES public.m_bagian (abbrev);

-- posto → m_wilayah
ALTER TABLE public.posto
    ADD CONSTRAINT fk_posto_wilayah
    FOREIGN KEY (wilayah) REFERENCES public.m_wilayah (abbrev);

-- posto → produk
ALTER TABLE public.posto
    ADD CONSTRAINT fk_posto_produk
    FOREIGN KEY (produk) REFERENCES public.produk (id);

-- posto → transport
ALTER TABLE public.posto
    ADD CONSTRAINT fk_posto_transport
    FOREIGN KEY (transport) REFERENCES public.transport (kode);

-- posto_cutoff → posto
ALTER TABLE public.posto_cutoff
    ADD CONSTRAINT fk_posto_cutoff_noposto
    FOREIGN KEY (noposto) REFERENCES public.posto (noposto);

-- posto_deleted → gudang
ALTER TABLE public.posto_deleted
    ADD CONSTRAINT fk_posto_deleted_tujuan
    FOREIGN KEY (tujuan) REFERENCES public.gudang (id);

-- posto_deleted → m_wilayah
ALTER TABLE public.posto_deleted
    ADD CONSTRAINT fk_posto_deleted_wilayah
    FOREIGN KEY (wilayah) REFERENCES public.m_wilayah (abbrev);

-- posto_deleted → produk
ALTER TABLE public.posto_deleted
    ADD CONSTRAINT fk_posto_deleted_produk
    FOREIGN KEY (produk) REFERENCES public.produk (id);

-- posto_deleted → transport
ALTER TABLE public.posto_deleted
    ADD CONSTRAINT fk_posto_deleted_transport
    FOREIGN KEY (transport) REFERENCES public.transport (kode);

-- posto_upload → produk
ALTER TABLE public.posto_upload
    ADD CONSTRAINT fk_posto_upload_produk
    FOREIGN KEY (produk) REFERENCES public.produk (id);

-- posto_upload → transport
ALTER TABLE public.posto_upload
    ADD CONSTRAINT fk_posto_upload_transport
    FOREIGN KEY (transport) REFERENCES public.transport (kode);

-- posto_upload → gudang
ALTER TABLE public.posto_upload
    ADD CONSTRAINT fk_posto_upload_tujuan
    FOREIGN KEY (tujuan) REFERENCES public.gudang (id);

-- posto_upload has no company_code column, FK skipped intentionally

-- produkmapping → produk
ALTER TABLE public.produkmapping
    ADD CONSTRAINT fk_produkmapping_produk
    FOREIGN KEY (produk) REFERENCES public.produk (id);

-- tiket → kuota4shift
ALTER TABLE public.tiket
    ADD CONSTRAINT fk_tiket_idshift
    FOREIGN KEY (idshift) REFERENCES public.kuota4shift (id);

-- tiket → m_status (statuspemuatan)
ALTER TABLE public.tiket
    ADD CONSTRAINT fk_tiket_statuspemuatan
    FOREIGN KEY (statuspemuatan) REFERENCES public.m_status (abbrev);

-- tiket → m_status (position)
ALTER TABLE public.tiket
    ADD CONSTRAINT fk_tiket_position
    FOREIGN KEY (position) REFERENCES public.m_status (abbrev);

-- tiket → posto
ALTER TABLE public.tiket
    ADD CONSTRAINT fk_tiket_posto
    FOREIGN KEY (posto) REFERENCES public.posto (noposto);

-- tiket → produk
ALTER TABLE public.tiket
    ADD CONSTRAINT fk_tiket_idproduk
    FOREIGN KEY (idproduk) REFERENCES public.produk (id);

-- tiket → transport
ALTER TABLE public.tiket
    ADD CONSTRAINT fk_tiket_idtransport
    FOREIGN KEY (idtransport) REFERENCES public.transport (kode);

-- tiket_deleted_alasan → tiket_history
ALTER TABLE public.tiket_deleted_alasan
    ADD CONSTRAINT fk_tiket_deleted_alasan_bookingno
    FOREIGN KEY (bookingno) REFERENCES public.tiket_history (bookingno)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- tiket_history → m_status (statuspemuatan)
ALTER TABLE public.tiket_history
    ADD CONSTRAINT fk_tiket_history_statuspemuatan
    FOREIGN KEY (statuspemuatan) REFERENCES public.m_status (abbrev);

-- tiket_history → m_status (position)
ALTER TABLE public.tiket_history
    ADD CONSTRAINT fk_tiket_history_position
    FOREIGN KEY (position) REFERENCES public.m_status (abbrev);

-- tiket_history → posto
ALTER TABLE public.tiket_history
    ADD CONSTRAINT fk_tiket_history_posto
    FOREIGN KEY (posto) REFERENCES public.posto (noposto)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- tiket_history → posto_deleted
ALTER TABLE public.tiket_history
    ADD CONSTRAINT fk_tiket_history_postodeleted
    FOREIGN KEY (postodeleted) REFERENCES public.posto_deleted (noposto);

-- tiket_history → produk
ALTER TABLE public.tiket_history
    ADD CONSTRAINT fk_tiket_history_idproduk
    FOREIGN KEY (idproduk) REFERENCES public.produk (id);

-- tiket_history → transport
ALTER TABLE public.tiket_history
    ADD CONSTRAINT fk_tiket_history_idtransport
    FOREIGN KEY (idtransport) REFERENCES public.transport (kode);

-- wtc.logsanggahan → transport (via kodeekspeditur)
ALTER TABLE wtc.logsanggahan
    ADD CONSTRAINT fk_logsanggahan_kodeekspeditur
    FOREIGN KEY (kodeekspeditur) REFERENCES public.transport (kode);

-- wtc.regional → company
ALTER TABLE wtc.regional
    ADD CONSTRAINT fk_regional_companycode
    FOREIGN KEY (companycode) REFERENCES public.company (company_code)
    ON UPDATE CASCADE;

-- wtc.regionaltruk → sumbu
ALTER TABLE wtc.regionaltruk
    ADD CONSTRAINT fk_regionaltruk_idjenistruk
    FOREIGN KEY (idjenistruk) REFERENCES public.sumbu (id)
    ON UPDATE CASCADE;

-- wtc.regionaltruk → wtc.regional
ALTER TABLE wtc.regionaltruk
    ADD CONSTRAINT fk_regionaltruk_idregional
    FOREIGN KEY (idregional) REFERENCES wtc.regional (id);

-- wtc.rute → wtc.regional
ALTER TABLE wtc.rute
    ADD CONSTRAINT fk_rute_idregional
    FOREIGN KEY (idregional) REFERENCES wtc.regional (id);

-- wtc.ruteplant → gudang (asal)
ALTER TABLE wtc.ruteplant
    ADD CONSTRAINT fk_ruteplant_plantasal
    FOREIGN KEY (plantasal) REFERENCES public.gudang (id);

-- wtc.ruteplant → gudang (tujuan)
ALTER TABLE wtc.ruteplant
    ADD CONSTRAINT fk_ruteplant_planttujuan
    FOREIGN KEY (planttujuan) REFERENCES public.gudang (id);

-- wtc.ruteplant → wtc.rute
ALTER TABLE wtc.ruteplant
    ADD CONSTRAINT fk_ruteplant_ruteid
    FOREIGN KEY (ruteid) REFERENCES wtc.rute (id);

-- wtc.rutetruk → wtc.rute
ALTER TABLE wtc.rutetruk
    ADD CONSTRAINT fk_rutetruk_ruteid
    FOREIGN KEY (ruteid) REFERENCES wtc.rute (id);

-- wtc.sanggahan → transport
ALTER TABLE wtc.sanggahan
    ADD CONSTRAINT fk_sanggahan_kodeekspeditur
    FOREIGN KEY (kodeekspeditur) REFERENCES public.transport (kode);
