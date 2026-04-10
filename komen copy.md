1. ROLE
    - Super Admin
        1. superadmin mendapatkan semua akses untuk setup aplikasi, menghapus data, mendapatkan report, mensetting plant
    - Admin
        1. admin hanya dapat melihat semua progress yang ada disetiap plant, contoh antrian, tracking truck, dan stock yang ada disetiap gudang
        2. admin tidak dapat mengubah data yang sudah ada  
    - Rekanan/Ekspeditur/Transportir
        1. rekanan dapat membuat tiket pemuatan yang akan digunakan untuk proses booking dan checkpoint di gudang
        2. rekanan dapat memesan posto yang sudah diterbitkan oleh POD
        3. rekanan dapat memantau posisi truck, status tiket, dan status posto
        4. rekanan dapat melihat laporan yang ada di akunnya masing"
        5. rekanan dapat melakukan pengajuan armada
        6. rekanan dapat melakukan pengajuan jatuh tempo 
        7. rekanan dapat memantau antrian di setiap gudang yang dituju berdasarkan posto
    - Gudang
        1. gudang dapat menerima tiket pemuatan jika sudah melalui proses checkin di security dengan scan tiket
        2. gudang dapat menambah stock yang ada di gudang 
        3. gudang dapat memantau antrian yang ada di gudangnya
        4. gudang dapat melakukan proses checkout dengan scan tiket
    - Security
        1. security dapat melakukan proses checkin dengan scan tiket
        2. security dapat melakukan proses checkout dengan scan tiket
        3. security dapat melakukan proses penolakan jika armada yang datang tidak sesuai dengan dokumen yang dibawa dan tiket
    - Jembatan Timbang
        1. jembatan timbang dapat melakukan proses penimbangan checkin dengan scan tiket
        2. jembatan timbang dapat melakukan proses penimbangan checkout dengan scan tiket
    - POD
        1. POD dapat membuat posto
        2. POD dapat memantau antrian yang ada di setiap gudang
        3. POD dapat menghapus tiket
        4. POD dapat mengapprove pengajuan armada dari rekanan
        5. pOD dapat membuat kuota untuk pemuatan
        6. POD dapat membatalkan posto dan menghapus posto 
        7. POD dapat melihat laporan yang ada di akunnya masing"
        8. POD dapat mengubah data yang sudah ada
        9. POD dapat menghapus dan menambah armada
        10. POD dapat membypass antrian di gudang pemuatan
        11. POD dapat 
    - PKD
        1. PKD dapat memantau semua aktivitas yang ada digudang mana saja dan dapat memantau semua pergerakan truck
        2. PKD dapat menambah rekanan, 
    - Eksternal 
        1. Eksternal dapat mengakses api yang sudah disediakan khusus untuk API menggunakan secret saja


2. FLOW BISNIS
    - POD akan mensetup kuota dan shifting di gudang" yang ditugaskan
    - 1 POD bisa memegang 2 atau lebih gudang
    - POD dapat membuat dokumen posto berdasarkan data yang dari apg, atau mengupload dari template yang diupload nantinya
    - jika sudah diupload POSTO nya maka rekanan dapat memesan posto tersebut berdasarkan kode rekanan yang ada di posto    
    - jika tiket sudah terbit maka dapat menuju gudang untuk proses pemuatan
    - ketika sampai pabrik rekanan harus melakukan checkin dengan scan tiket di user security
    - setelah masuk antrian gudang maka akan dilakukan proses penimbangan checkin dengan scan tiket di user jembatan timbang
    - setelah penimbangan checkin maka akan dilakukan proses pemuatan dengan scan tiket di user gudang
    - setelah penimbangan checkin maka akan dilakukan proses pemuatan checkout dengan scan tiket di user gudang
    - setelah pemuatan maka akan dilakukan proses penimbangan checkout dengan scan tiket di user jembatan timbang
    - setelah penimbangan checkout maka akan dilakukan proses checkout dengan scan tiket di user security
    - setelah checkout maka akan keluar dari antrian gudang
    - setelah proses pemuatan user rekanan akan diarahkan / direkomendasikan untuk mengintegrasikan tiket sistro dengan nomor DO/surat jalan
    - 


3. company/plant
    company/plant ialah pabrik/gudang yang digunakan untuk pemuatan, company/plant ini akan dipegang oleh POD, setiap company akan menempel kode plant untuk identitasnya, company/plant terdaftar di apg, dan dibagi di dua wilayah yaitu wilayah barat dan wilayah timur, setiap company/plant memiliki user security, user jembatan timbang, user gudang, user POD,user rekanan, user ekspeditur, user transportir

4. MENU dan role  
    1. superadmin
        1. Dashboard
        2. Tiket
        3. Posto
        4. Antrian Gudang
        5. Tracking Truck
        6. Stock
        7. Laporan
        8. Pengaturan
            - Role
            - User
            - Rekanan/Ekspeditur/Transportir
            - Company/Plant
            - Produk
            - 
    2. admin
        1. Dashboard
        2. Tiket
        3. Posto
        4. Antrian Gudang
        5. Tracking Truck
        6. Stock
        7. Laporan
        8. Pengaturan
            - Role
            - User
            - Rekanan/Ekspeditur/Transportir
            - Company/Plant
            - Produk
            - 
    3. Rekanan/Ekspeditur/Transportir
        1. Dashboard
        2. Tiket
        3. Posto
        4. Antrian Gudang
        5. Tracking Truck
        6. Stock
        7. Laporan
        8. Armada
        9. Pengajuan Jatuh Tempo
        10. Pengajuan Armada

    4. Security 
        1. Dashboard
        2. Tiket
        3. Posto
        4. Scan Tiket    
    5. Gudang
        1. Dashboard
        2. Tiket
        3. Posto
        4. Antrian Gudang
        5. Stock
        6. Scan Tiket
     
    6. Jembatan Timbang
        1. Dashboard
        2. Tiket
        3. Posto
        4. Antrian Gudang
        5. Scan Tiket
         
    7. POD
        1. Dashboard
        2. Tiket
        3. Posto
        4. Antrian Gudang
        5. Tracking Truck
        6. Stock
        7. Laporan
        8. Armada 
        9. approver pengajuan armada

    8. PKD
        1. Dashboard
        2. Tiket
        3. Posto
        4. Antrian Gudang
        5. Tracking Truck
        6. Stock
        7. Laporan
      
    8. Eksternal
        1. Dashboard
        