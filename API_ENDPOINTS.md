# SISTROAWESOME - API Endpoint Reference

Base URL dev/testing : http://192.168.188.170:8090
Base URL production  : https://sistro.pupuk-indonesia.com
Auth                 : Authorization: Bearer <access_token>
                       (kecuali /Token dan /api/NotLogin/*)

---

## Auth dan Login

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | /Token | grant_type=password, username, password, companycode |
| POST | /api/MFA/Login | |
| POST | /api/MFA/SendOtpMethod | |
| POST | /api/NotLogin/ListCompany | |

---

## User Account

| Method | Endpoint |
|--------|----------|
| GET | /api/UserAccount/ListUser |
| GET | /api/UserAccount/ListUserperRole?role= |
| GET | /api/UserAccount/UserCandalDept |
| GET | /api/UserAccount/DataRole |
| GET | /api/UserAccount/GetUserForEdit?id= |
| GET | /api/UserAccount/GetUserDetail?username= |
| GET | /api/UserAccount/getUserAll |
| GET | /api/Data/DetailUser |
| POST | /api/UserAccount/Register |
| POST | /api/UserAccount/RegisterTransportir |
| POST | /api/UserAccount/UpdateUserProfile |
| POST | /api/UserAccount/DeleteData |
| POST | /api/UserAccount/ChangePassword |
| POST | /api/UserAccount/ChangePassword2 |
| POST | /api/UserAccount/ChangePasswordMobile |
| POST | /api/UserAccount/AddtoRole |
| POST | /api/UserAccount/RemoveUserFromRole |
| POST | /api/UserAccount/UpdateProfil |
| POST | /api/UserAccount/UpdateProfilMobile |
| POST | /api/UserAccount/Profil |
| POST | /api/UserAccount/SendWA |
| POST | /api/UserAccount/SubscribeToTopic |
| POST | /api/UserAccount/UnsubcribeFromTopic |

---

## Dashboard dan Home

| Method | Endpoint |
|--------|----------|
| GET | /api/Home/ListCompany |
| GET | /api/Home/ListCompanyGolive |
| GET | /api/Home/GetAttributeHome |
| GET | /api/Home/GetAttributeHomeTransport |
| GET | /api/Home/GetIntegratedTickets |
| GET | /api/Home/GetViewerDashboardStats |
| GET | /api/Home/GetTiketTrendPerPlant |
| GET | /api/Home/GetTiketTrendPerHour |
| GET | /api/Home/GetDurasiProsesMuat |
| GET | /api/Home/GetDurasiTiket |
| GET | /api/Home/pushNotifikasi |
| GET | /api/Home/PhoneNumberForModal |
| GET | /api/Home/filterMap |
| POST | /api/Home/pushNotifikasi_read |
| POST | /api/Home/pushNotifikasi_read_param |
| POST | /api/Home/updateTokenFirebase |
| POST | /api/Home/FilterChart |
| POST | /api/Home/Simpan_PhoneNumberforModal |

---

## Armada (Fleet Management)

| Method | Endpoint |
|--------|----------|
| GET | /api/Armada/Data?posto= |
| GET | /api/Armada/DataPagination?posto= |
| GET | /api/Armada/DataPaginationPercepatan?posto= |
| GET | /api/Armada/DataFilter?param=&company= |
| GET | /api/Armada/Alasan |
| GET | /api/Armada/SumbuData?filter= |
| GET | /api/Armada/GetTransportirData |
| POST | /api/Armada/Add |
| POST | /api/Armada/AddBaru |
| POST | /api/Armada/ChangeData |
| POST | /api/Armada/ChangeDataBaru |
| POST | /api/Armada/AddReview |
| POST | /api/Armada/AddReviewBaruAsync |
| POST | /api/Armada/UpdateReviewBaruAsync |
| POST | /api/Armada/EditDataReview |
| POST | /api/Armada/ApproveDataReview |
| POST | /api/Armada/TolakDataReview |
| POST | /api/Armada/DeleteData |
| POST | /api/Armada/DeleteDataReview |
| POST | /api/Armada/DetailData |
| POST | /api/Armada/DetailDataReview |
| POST | /api/Armada/TransferUpload |
| POST | /api/Armada/DataTable |
| POST | /api/Armada/DataTable_Upload |
| POST | /api/Armada/DataTableReview |
| POST | /api/Armada/DataTableReviewBaru |
| POST | /api/Armada/DataTableUnapprovedArmada |
| POST | /api/Armada/ArmadaListMobile |
| POST | /api/Armada/ArmadaReviewMobile |

---

## Tiket (Ticket)

| Method | Endpoint |
|--------|----------|
| GET | /api/Tiket/Aktif |
| GET | /api/Tiket/DetailTiket |
| POST | /api/Tiket/PostData |
| POST | /api/Tiket/UpdateData |
| POST | /api/Tiket/DeleteData |
| POST | /api/Tiket/DeleteDataAll |
| POST | /api/Tiket/DeleteSP |
| POST | /api/Tiket/ForceDeleteSP |
| POST | /api/Tiket/DetailData |
| POST | /api/Tiket/TrackData |
| POST | /api/Tiket/ChangeShift |
| POST | /api/Tiket/ChangeShiftBaru |
| POST | /api/Tiket/SkipAntrian |
| POST | /api/Tiket/CallAntrian |
| POST | /api/Tiket/CheckinDW1_GP |
| POST | /api/Tiket/CheckinDW2_INBAG |
| POST | /api/Tiket/getNomorDO |
| POST | /api/Tiket/DataTable |
| POST | /api/Tiket/DataTablePeriodeTiket |
| POST | /api/Tiket/DataTableFilter |
| POST | /api/Tiket/DataReport |
| POST | /api/Tiket/TiketCancelDataReport |
| POST | /api/Tiket/DataTiket |
| POST | /api/Tiket/GetTiketAll |
| POST | /api/Tiket/GetFilteredTickets |
| POST | /api/Tiket/DashboardTiket |
| POST | /api/Tiket/DashboardTiketAnper |
| POST | /api/Tiket/LogBypass |
| POST | /api/Tiket/DataUppJatim |
| POST | /api/Tiket/DataUppPelabuhan |
| POST | /api/Tiket/DataUppBooking |
| POST | /api/Tiket/DataUppMeneng |
| POST | /api/Tiket/DataUppLingkar |
| POST | /api/Tiket/DataMBS |
| POST | /api/Tiket/DataRoomo |
| POST | /api/Tiket/DataDSP |

---

## Antrian (Queue)

| Method | Endpoint |
|--------|----------|
| POST | /api/Antrian/DataTable |
| POST | /api/Antrian/AntrianMobile |
| POST | /api/Antrian/ByPassProcess |
| POST | /api/Antrian/DataTableFilter_Bypass |
| POST | /api/Data/CheckinTimbangan |
| POST | /api/Data/DetailTiket |
| POST | /api/Data/SelfCheckin |

---

## POSTO

| Method | Endpoint |
|--------|----------|
| GET | /api/POSTO/TiketBaru |
| POST | /api/POSTO/DataTable |
| POST | /api/POSTO/DataTableFilter |
| POST | /api/POSTO/DataTable1 |
| POST | /api/POSTO/DataTable_Upload |
| POST | /api/POSTO/DataTable_UploadPosto |
| POST | /api/POSTO/CutOff_DataTable_Upload |
| POST | /api/POSTO/DetailData |
| POST | /api/POSTO/UpdateData |
| POST | /api/POSTO/DeleteData |
| POST | /api/POSTO/TransferUpload |
| POST | /api/POSTO/CutOff_TransferUpload |
| POST | /api/POSTO/Available |
| POST | /api/POSTO/AvailableBaru |
| POST | /api/POSTO/Available2 |
| POST | /api/POSTO/ChangeMassActive |
| POST | /api/POSTO/ChangeMassNonActive |
| POST | /api/POSTO/DatatablePrioritas |
| POST | /api/POSTO/CheckImportCutOff |
| POST | /api/POSTO/simpanImportCutOff |
| POST | /api/POSTO/DatatablePengajuanJapo |
| POST | /api/POSTO/DatatableRiwayatPengajuanJapo |

---

## Gudang (Warehouse)

| Method | Endpoint |
|--------|----------|
| GET | /api/Gudang/Data |
| GET | /api/Gudang/ListGudang |
| GET | /api/Gudang/SkipAntrianMeneng |
| GET | /api/Gudang/SkipAntrianLingkar |
| GET | /api/Gudang/SkipAntrianMbs |
| GET | /api/Gudang/SkipAntrianRoomo |
| GET | /api/Gudang/SkipAntrianDsp |
| GET | /api/Gudang/BatchMeneng |
| GET | /api/Gudang/BatchLingkar |
| GET | /api/Gudang/BatchMbs |
| GET | /api/Gudang/BatchRoomo |
| GET | /api/Gudang/BatchDsp |
| GET | /api/Gudang/WarnaMeneng |
| GET | /api/Gudang/WarnaRoomo |
| GET | /api/Gudang/WarnaDsp |
| POST | /api/Gudang/DataMapping |
| POST | /api/Gudang/DataMappingStockKurang |
| POST | /api/Gudang/DataGudangTujuan |
| POST | /api/Gudang/DataGudangTujuanChecklist |
| POST | /api/Gudang/ListGudangPilihan |
| POST | /api/Gudang/DetailData |
| POST | /api/Gudang/DetailDataTujuan |
| POST | /api/Gudang/UpdateData |
| POST | /api/Gudang/UpdatePindahGudang |
| POST | /api/Gudang/PostData |
| POST | /api/Gudang/LogStok |
| POST | /api/Gudang/TrafficGudang |
| POST | /api/Gudang/ChangeAntrian |
| POST | /api/Gudang/GudangMuatSetting |
| POST | /api/GudangLini3/Scan |
| POST | /api/GudangLini3/DetailData |
| POST | /api/GudangLini3/DetailDataVerifikasi |
| POST | /api/GudangLini3/DetailDataVerifikasiDo |
| POST | /api/GudangLini3/Verifikasi |

---

## Kuota (Quota Management)

| Method | Endpoint |
|--------|----------|
| GET | /api/Kuota/DataWilayah |
| GET | /api/Kuota/DataBagian |
| GET | /api/KuotaTemplate/List |
| GET | /api/KuotaTemplate/Filter?idProduk= |
| POST | /api/Kuota/Add |
| POST | /api/Kuota/AddWizard |
| POST | /api/Kuota/UpdateWizard |
| POST | /api/KuotaTemplate/Update |
| GET | /api/KuotaLevel1/Summary |
| POST | /api/KuotaLevel1/PostData |
| POST | /api/KuotaLevel1/UpdateData |
| POST | /api/KuotaLevel1/DetailData |
| POST | /api/KuotaLevel1/DataTable |
| POST | /api/KuotaLevel1/DataTableFilter |
| POST | /api/KuotaLevel1/LogDataReport |
| GET | /api/KuotaLevel2/Summary |
| POST | /api/KuotaLevel2/PostData |
| POST | /api/KuotaLevel2/UpdateData |
| POST | /api/KuotaLevel2/DetailData |
| POST | /api/KuotaLevel2/DataTable |
| POST | /api/KuotaLevel3/PostData |
| POST | /api/KuotaLevel3/UpdateData |
| POST | /api/KuotaLevel3/DetailData |
| POST | /api/KuotaLevel3/DataTable |
| POST | /api/KuotaLevel4/PostData |
| POST | /api/KuotaLevel4/UpdateData |
| POST | /api/KuotaLevel4/DetailData |
| POST | /api/KuotaLevel4/DataTable |
| POST | /api/KuotaLevel4/DataforReschedule |
| POST | /api/KuotaLevel4/PilihPeriodeData |
| POST | /api/KuotaLevel4/PilihPeriodeMobile |

---

## Shift, SO dan Resume

| Method | Endpoint |
|--------|----------|
| POST | /api/Shift/ChangeData |
| POST | /api/Shift/DetailData |
| POST | /api/Shift/DataMapping |
| POST | /api/Shift/DataMappingFilter |
| POST | /api/SO/DataTable |
| POST | /api/SO/DataTableFilter |
| POST | /api/Resume/DataTableFilter |

---

## Mapping dan Konfigurasi

| Method | Endpoint |
|--------|----------|
| GET | /api/Wilayah/Data |
| GET | /api/Wilayah/DataForMapping |
| GET | /api/Wilayah/DataMappingPOSTO |
| GET | /api/Bagian/Data |
| GET | /api/Alasan/DataFilter?param= |
| GET | /api/Sumbu/TarikSumbuPercepatan |
| GET | /api/Sumbu/TarikSumbuPercepatan1 |
| POST | /api/Sumbu/DataTable |
| POST | /api/Sumbu/DetailData |
| POST | /api/Sumbu/PostData |
| POST | /api/Sumbu/RemoveData |
| POST | /api/Sumbu/SumbuPercepatan |
| POST | /api/Sumbu/SaveSumbuPercepatan |
| POST | /api/Mapping/DataTable_MappingProdukGudang |
| POST | /api/Mapping/Detail_MappingProdukGudang |
| POST | /api/Mapping/PostData_MappingProdukGudang |
| POST | /api/Mapping/Remove_MappingProdukGudang |
| POST | /api/Mapping/DataMappingGudangByPassOdol |
| POST | /api/Mapping/PostMappingGudangByPassOdol |
| POST | /api/Mapping/DeleteMappingGudangByPassOdol |
| POST | /api/Mapping/GudangSPPTData |
| POST | /api/MappingZeroOdol/Datatable |
| POST | /api/MappingZeroOdol/PostData |
| POST | /api/MappingZeroOdol/UpdateData |
| POST | /api/MappingZeroOdol/DetailData |
| POST | /api/MappingZeroOdol/Delete |

---

## Company dan Plant

| Method | Endpoint |
|--------|----------|
| GET | /api/Company/Data |
| GET | /api/Company/getCompanyListFitur |
| GET | /api/Company/GetPlantManagement |
| GET | /api/Company/GetPlantDetail?company_code= |
| POST | /api/Company/UpdatePlant |

---

## Produk dan Mapping Produk

| Method | Endpoint |
|--------|----------|
| GET | /api/Produk/Data |
| GET | /api/Produk/ProdukList |
| GET | /api/Produk/ProdukListAnper |
| GET | /api/ProdukMapping/ProdukList |
| GET | /api/ProdukMapping/ProdukMappingList |
| GET | /api/ProdukMapping/CompanyList |
| POST | /api/Produk/DataTable |
| POST | /api/Produk/AddProduk |
| POST | /api/Produk/DataTableMapping |
| POST | /api/Produk/ProdukCheck |
| POST | /api/ProdukMapping/datatable |
| POST | /api/ProdukMapping/DetailData |
| POST | /api/ProdukMapping/SaveData |
| POST | /api/ProdukMapping/UpdateData |
| POST | /api/ProdukMapping/RemoveData |

---

## WTC dan Report

| Method | Endpoint |
|--------|----------|
| GET | /api/ReportWtc/GetTransportCharter |
| POST | /api/ReportWtc/ReportWtcGetData |
| GET | /api/Wtc/DataSumbu |
| GET | /api/Wtc/DataCompany |
| GET | /api/Wtc/DataRegional |
| GET | /api/Wtc/DataGudang |
| POST | /api/Wtc/SaveRegional |
| POST | /api/Wtc/EditRegional |
| POST | /api/Wtc/saveRute |
| POST | /api/Wtc/DeleteRegional |
| POST | /api/Wtc/DeleteRute |
| POST | /api/Wtc/DetailData |
| POST | /api/Wtc/DetailDataRute |
| POST | /api/Wtc/DataTable |
| POST | /api/Wtc/DataTableRute |
| POST | /api/Wtc/RiwayatWTC |
| POST | /api/Wtc/RiwayatCharter |
| POST | /api/Wtc/savePengajuanWTC |
| POST | /api/Wtc/editPengajuanWTC |
| POST | /api/Wtc/savePengajuanRespon |
| POST | /api/Wtc/DataTablePengajuanWTC |
| POST | /api/Wtc/DataTableRiwayatPengajuanWTC |
| POST | /api/Wtc/getDataTrukRegional |
| POST | /api/Wtc/ListPengajuanWTC |
| POST | /api/Wtc/DetailDataSanggahan |
| POST | /api/Wtc/DetailDataSanggahanEks |
| POST | /api/Wtc/DetailRiwayatEks |

---

## Mobile Transport

| Method | Endpoint |
|--------|----------|
| GET | /api/MobileTransport/ListPosto |
| GET | /api/MobileTransport/PostoDetail |
| GET | /api/MobileTransport/ListTiket |
| GET | /api/MobileTransport/TiketDetail |
| GET | /api/MobileTransport/ListArmada |
| GET | /api/MobileTransport/ListArmadaPagination |
| GET | /api/MobileTransport/ListArmadaPaginationPercepatan |
| GET | /api/MobileTransport/ListArmadaReview |
| GET | /api/MobileTransport/ArmadaDetail |
| GET | /api/MobileTransport/DashboardCount |
| GET | /api/MobileTransport/StatistikPemuatan |
| GET | /api/MobileTransport/GetNotifikasi |
| GET | /api/MobileTransport/GetProfil |
| GET | /api/MobileTransport/ListCompany |
| GET | /api/MobileTransport/ListSumbu |
| GET | /api/MobileTransport/ListAlasan |
| POST | /api/MobileTransport/PesanTiket |
| POST | /api/MobileTransport/AddArmada |
| POST | /api/MobileTransport/EditArmada |
| POST | /api/MobileTransport/AddArmadaReviewAsync |
| POST | /api/MobileTransport/DeleteArmada |
| POST | /api/MobileTransport/UpdateTiket |
| POST | /api/MobileTransport/ReadNotifikasi |
| POST | /api/MobileTransport/UpdateFirebaseToken |
| POST | /api/MobileTransport/SubscribeTopic |
| POST | /api/MobileTransport/UnsubscribeTopic |
| POST | /api/MobileTransport/UpdateProfil |
| POST | /api/MobileTransport/ChangePassword |

---

## APG, Delivery, Indigo dan Transportir

| Method | Endpoint |
|--------|----------|
| GET | /api/Apg/getDataNotif |
| POST | /api/Apg/SavePengajuanJapoEks |
| POST | /api/Apg/PrintInvoiceDoPosto |
| GET | /api/Delivery/GudangList |
| GET | /api/Delivery/NopolList |
| POST | /api/Delivery/DataTable |
| POST | /api/Delivery/SimpanDelivery |
| POST | /api/Delivery/UpdateDelivery |
| POST | /api/Delivery/DeleteDelivery |
| POST | /api/Delivery/DetailDataDelivery |
| POST | /api/Delivery/DetailDataDeliveryProduct |
| POST | /api/Indigo/DataIportLog |
| POST | /api/Indigo/DataQrLogDo |
| POST | /api/Indigo/UpdateDataQrLogDo |
| POST | /api/Indigo/portStatusMap |
| GET | /api/Transportir/Data |
| GET | /api/Transportir/GetTransportCharter |
| POST | /api/Transportir/DataTable |
| POST | /api/Transportir/Register |
| POST | /api/Transportir/AddData |
