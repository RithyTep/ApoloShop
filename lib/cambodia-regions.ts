// Cambodia Provinces and Districts Data
// Used for shipping zone configuration

export interface Province {
  code: string;
  nameEn: string;
  nameKh: string;
  type: "province" | "capital";
  districts: District[];
}

export interface District {
  code: string;
  nameEn: string;
  nameKh: string;
}

// Cambodia has 25 provinces (khet) including 1 capital (reach thani)
export const CAMBODIA_PROVINCES: Province[] = [
  {
    code: "PP",
    nameEn: "Phnom Penh",
    nameKh: "ភ្នំពេញ",
    type: "capital",
    districts: [
      { code: "PP-CK", nameEn: "Chamkar Mon", nameKh: "ចំការមន" },
      { code: "PP-DK", nameEn: "Doun Penh", nameKh: "ដូនពេញ" },
      { code: "PP-TK", nameEn: "7 Makara", nameKh: "៧មករា" },
      { code: "PP-TL", nameEn: "Toul Kork", nameKh: "ទួលគោក" },
      { code: "PP-DT", nameEn: "Dangkao", nameKh: "ដង្កោ" },
      { code: "PP-MK", nameEn: "Mean Chey", nameKh: "មានជ័យ" },
      { code: "PP-RK", nameEn: "Russey Keo", nameKh: "ឫស្សីកែវ" },
      { code: "PP-SK", nameEn: "Sen Sok", nameKh: "សែនសុខ" },
      { code: "PP-PT", nameEn: "Por Sen Chey", nameKh: "ពោធិ៍សែនជ័យ" },
      { code: "PP-CP", nameEn: "Chroy Changvar", nameKh: "ជ្រោយចង្វារ" },
      { code: "PP-PR", nameEn: "Prek Pnov", nameKh: "ព្រែកព្នៅ" },
      { code: "PP-CM", nameEn: "Chbar Ampov", nameKh: "ច្បារអំពៅ" },
      { code: "PP-BK", nameEn: "Boeng Keng Kang", nameKh: "បឹងកេងកង" },
      { code: "PP-KK", nameEn: "Kamboul", nameKh: "កំបូល" },
    ],
  },
  {
    code: "BTB",
    nameEn: "Battambang",
    nameKh: "បាត់ដំបង",
    type: "province",
    districts: [
      { code: "BTB-BT", nameEn: "Battambang", nameKh: "បាត់ដំបង" },
      { code: "BTB-BN", nameEn: "Banan", nameKh: "បាណន់" },
      { code: "BTB-TP", nameEn: "Thma Puok", nameKh: "ថ្មពួក" },
      { code: "BTB-SS", nameEn: "Sangke", nameKh: "សង្កែ" },
      { code: "BTB-SM", nameEn: "Samlout", nameKh: "សំឡូត" },
      { code: "BTB-RK", nameEn: "Ratanak Mondol", nameKh: "រតនមណ្ឌល" },
      { code: "BTB-MR", nameEn: "Moung Russei", nameKh: "មោងឫស្សី" },
      { code: "BTB-KR", nameEn: "Koas Krala", nameKh: "កោះក្រឡ" },
      { code: "BTB-PL", nameEn: "Phnum Proek", nameKh: "ភ្នំព្រឹក" },
      { code: "BTB-BP", nameEn: "Bovel", nameKh: "បវេល" },
      { code: "BTB-EK", nameEn: "Ek Phnom", nameKh: "ឯកភ្នំ" },
      { code: "BTB-KS", nameEn: "Kamrieng", nameKh: "កំរៀង" },
      { code: "BTB-RV", nameEn: "Rukhak Kiri", nameKh: "រុក្ខគីរី" },
    ],
  },
  {
    code: "SR",
    nameEn: "Siem Reap",
    nameKh: "សៀមរាប",
    type: "province",
    districts: [
      { code: "SR-SR", nameEn: "Siem Reap", nameKh: "សៀមរាប" },
      { code: "SR-AK", nameEn: "Angkor Chum", nameKh: "អង្គរជុំ" },
      { code: "SR-AT", nameEn: "Angkor Thom", nameKh: "អង្គរធំ" },
      { code: "SR-BK", nameEn: "Banteay Srei", nameKh: "បន្ទាយស្រី" },
      { code: "SR-CC", nameEn: "Chi Kraeng", nameKh: "ជីក្រែង" },
      { code: "SR-KK", nameEn: "Kralanh", nameKh: "ក្រឡាញ់" },
      { code: "SR-PK", nameEn: "Puok", nameKh: "ពួក" },
      { code: "SR-PR", nameEn: "Prasat Bakong", nameKh: "ប្រាសាទបាគង" },
      { code: "SR-ST", nameEn: "Sot Nikum", nameKh: "សូត្រនិគម" },
      { code: "SR-SP", nameEn: "Srei Snam", nameKh: "ស្រីស្នំ" },
      { code: "SR-SS", nameEn: "Svay Leu", nameKh: "ស្វាយលើ" },
      { code: "SR-VR", nameEn: "Varin", nameKh: "វ៉ារិន" },
    ],
  },
  {
    code: "KPT",
    nameEn: "Kampot",
    nameKh: "កំពត",
    type: "province",
    districts: [
      { code: "KPT-KP", nameEn: "Kampot", nameKh: "កំពត" },
      { code: "KPT-AK", nameEn: "Angkor Chey", nameKh: "អង្គរជ័យ" },
      { code: "KPT-BM", nameEn: "Banteay Meas", nameKh: "បន្ទាយមាស" },
      { code: "KPT-CT", nameEn: "Chhouk", nameKh: "ឈូក" },
      { code: "KPT-CK", nameEn: "Chum Kiri", nameKh: "ជុំគីរី" },
      { code: "KPT-DT", nameEn: "Dang Tong", nameKh: "ដងទង់" },
      { code: "KPT-KT", nameEn: "Kampong Trach", nameKh: "កំពង់ត្រាច" },
      { code: "KPT-TB", nameEn: "Teuk Chhou", nameKh: "ទឹកឈូ" },
    ],
  },
  {
    code: "KPS",
    nameEn: "Kampong Speu",
    nameKh: "កំពង់ស្ពឺ",
    type: "province",
    districts: [
      { code: "KPS-KS", nameEn: "Kampong Speu", nameKh: "កំពង់ស្ពឺ" },
      { code: "KPS-BS", nameEn: "Basedth", nameKh: "បស្សី" },
      { code: "KPS-CP", nameEn: "Chbar Mon", nameKh: "ច្បារមន" },
      { code: "KPS-KL", nameEn: "Kong Pisei", nameKh: "កងពិសី" },
      { code: "KPS-AP", nameEn: "Aural", nameKh: "ឱរ៉ាល់" },
      { code: "KPS-OR", nameEn: "Odongk", nameKh: "ឧដុង្គ" },
      { code: "KPS-PK", nameEn: "Phnum Sruoch", nameKh: "ភ្នំស្រូច" },
      { code: "KPS-SM", nameEn: "Samraong Tong", nameKh: "សំរោងទង" },
      { code: "KPS-TP", nameEn: "Thpong", nameKh: "ថ្ពង" },
    ],
  },
  {
    code: "KCM",
    nameEn: "Kampong Cham",
    nameKh: "កំពង់ចាម",
    type: "province",
    districts: [
      { code: "KCM-KC", nameEn: "Kampong Cham", nameKh: "កំពង់ចាម" },
      { code: "KCM-BS", nameEn: "Batheay", nameKh: "បាធាយ" },
      { code: "KCM-CC", nameEn: "Chamkar Leu", nameKh: "ចំការលើ" },
      { code: "KCM-CT", nameEn: "Cheung Prey", nameKh: "ជើងព្រៃ" },
      { code: "KCM-KS", nameEn: "Kampong Siem", nameKh: "កំពង់សៀម" },
      { code: "KCM-KG", nameEn: "Kang Meas", nameKh: "កងមាស" },
      { code: "KCM-KP", nameEn: "Koh Sotin", nameKh: "កោះសូទិន" },
      { code: "KCM-PR", nameEn: "Prey Chhor", nameKh: "ព្រៃឈរ" },
      { code: "KCM-ST", nameEn: "Srey Santhor", nameKh: "ស្រីសន្ធរ" },
      { code: "KCM-SP", nameEn: "Stueng Trang", nameKh: "ស្ទឹងត្រង់" },
    ],
  },
  {
    code: "KCH",
    nameEn: "Kampong Chhnang",
    nameKh: "កំពង់ឆ្នាំង",
    type: "province",
    districts: [
      { code: "KCH-KC", nameEn: "Kampong Chhnang", nameKh: "កំពង់ឆ្នាំង" },
      { code: "KCH-BL", nameEn: "Baribour", nameKh: "បរិបូណ៌" },
      { code: "KCH-CP", nameEn: "Chol Kiri", nameKh: "ជលគីរី" },
      { code: "KCH-KL", nameEn: "Kampong Leaeng", nameKh: "កំពង់លែង" },
      { code: "KCH-KT", nameEn: "Kampong Tralach", nameKh: "កំពង់ត្រឡាច" },
      { code: "KCH-RK", nameEn: "Rolea B'ier", nameKh: "រលាប្អៀរ" },
      { code: "KCH-SM", nameEn: "Sameakki Mean Chey", nameKh: "សាមគ្គីមានជ័យ" },
      { code: "KCH-TK", nameEn: "Tuek Phos", nameKh: "ទឹកផុស" },
    ],
  },
  {
    code: "KTM",
    nameEn: "Kampong Thom",
    nameKh: "កំពង់ធំ",
    type: "province",
    districts: [
      { code: "KTM-KT", nameEn: "Kampong Thom", nameKh: "កំពង់ធំ" },
      { code: "KTM-BK", nameEn: "Baray", nameKh: "បារាយណ៍" },
      { code: "KTM-KC", nameEn: "Kampong Svay", nameKh: "កំពង់ស្វាយ" },
      { code: "KTM-PR", nameEn: "Prasat Balangk", nameKh: "ប្រាសាទបាល័ង្គ" },
      { code: "KTM-PS", nameEn: "Prasat Sambour", nameKh: "ប្រាសាទសំបូរ" },
      { code: "KTM-SS", nameEn: "Sandan", nameKh: "សណ្ដាន់" },
      { code: "KTM-ST", nameEn: "Santuk", nameKh: "សន្ទុក" },
      { code: "KTM-SP", nameEn: "Stoung", nameKh: "ស្ទោង" },
    ],
  },
  {
    code: "KD",
    nameEn: "Kandal",
    nameKh: "កណ្ដាល",
    type: "province",
    districts: [
      { code: "KD-KD", nameEn: "Kandal Stueng", nameKh: "កណ្ដាលស្ទឹង" },
      { code: "KD-KS", nameEn: "Kien Svay", nameKh: "កៀនស្វាយ" },
      { code: "KD-LV", nameEn: "Lvea Aem", nameKh: "ល្វាឯម" },
      { code: "KD-MK", nameEn: "Mukh Kampul", nameKh: "មុខកំពូល" },
      { code: "KD-AS", nameEn: "Ang Snuol", nameKh: "អង្គស្នួល" },
      { code: "KD-LS", nameEn: "Leuk Daek", nameKh: "លើកដែក" },
      { code: "KD-PS", nameEn: "Ponhea Lueu", nameKh: "ពញាឮ" },
      { code: "KD-SS", nameEn: "S'ang", nameKh: "ស្អាង" },
      { code: "KD-TK", nameEn: "Takhmau", nameKh: "តាខ្មៅ" },
      { code: "KD-KH", nameEn: "Khsach Kandal", nameKh: "ខ្សាច់កណ្ដាល" },
      { code: "KD-PK", nameEn: "Ponhea Kraek", nameKh: "ពញាក្រែក" },
    ],
  },
  {
    code: "KK",
    nameEn: "Koh Kong",
    nameKh: "កោះកុង",
    type: "province",
    districts: [
      { code: "KK-KK", nameEn: "Koh Kong", nameKh: "កោះកុង" },
      { code: "KK-BS", nameEn: "Botum Sakor", nameKh: "បទុមសាគរ" },
      { code: "KK-KS", nameEn: "Kiri Sakor", nameKh: "គីរីសាគរ" },
      { code: "KK-SM", nameEn: "Smach Mean Chey", nameKh: "ស្មាច់មានជ័យ" },
      { code: "KK-MK", nameEn: "Mondol Seima", nameKh: "មណ្ឌលសីមា" },
      { code: "KK-ST", nameEn: "Srae Ambel", nameKh: "ស្រែអំបិល" },
      { code: "KK-TK", nameEn: "Thma Bang", nameKh: "ថ្មបាំង" },
    ],
  },
  {
    code: "KT",
    nameEn: "Kratié",
    nameKh: "ក្រចេះ",
    type: "province",
    districts: [
      { code: "KT-KT", nameEn: "Kratié", nameKh: "ក្រចេះ" },
      { code: "KT-CC", nameEn: "Chhlong", nameKh: "ឈ្លង" },
      { code: "KT-PK", nameEn: "Prek Prasab", nameKh: "ព្រែកប្រសព្វ" },
      { code: "KT-SM", nameEn: "Sambour", nameKh: "សំបូរ" },
      { code: "KT-SS", nameEn: "Snuol", nameKh: "ស្នួល" },
      { code: "KT-CT", nameEn: "Chetr Borei", nameKh: "ចិត្របុរី" },
    ],
  },
  {
    code: "MK",
    nameEn: "Mondulkiri",
    nameKh: "មណ្ឌលគីរី",
    type: "province",
    districts: [
      { code: "MK-SK", nameEn: "Saen Monourom", nameKh: "សែនមនោរម្យ" },
      { code: "MK-KR", nameEn: "Keo Seima", nameKh: "កែវសីមា" },
      { code: "MK-KH", nameEn: "Kaoh Nheaek", nameKh: "កោះញែក" },
      { code: "MK-OS", nameEn: "Ou Reang", nameKh: "អូរាំង" },
      { code: "MK-PT", nameEn: "Pichrada", nameKh: "ពេជ្រាដា" },
    ],
  },
  {
    code: "OD",
    nameEn: "Oddar Meanchey",
    nameKh: "ឧត្ដរមានជ័យ",
    type: "province",
    districts: [
      { code: "OD-SM", nameEn: "Samraong", nameKh: "សំរោង" },
      { code: "OD-AS", nameEn: "Anlong Veaeng", nameKh: "អន្លង់វែង" },
      { code: "OD-BK", nameEn: "Banteay Ampil", nameKh: "បន្ទាយអំពិល" },
      { code: "OD-CP", nameEn: "Chong Kal", nameKh: "ជ្រោយជង្វា" },
      { code: "OD-TB", nameEn: "Trapeang Prasat", nameKh: "ត្រពាំងប្រាសាទ" },
    ],
  },
  {
    code: "PL",
    nameEn: "Pailin",
    nameKh: "ប៉ៃលិន",
    type: "province",
    districts: [
      { code: "PL-PL", nameEn: "Pailin", nameKh: "ប៉ៃលិន" },
      { code: "PL-SL", nameEn: "Sala Krau", nameKh: "សាលាក្រៅ" },
    ],
  },
  {
    code: "PS",
    nameEn: "Preah Sihanouk",
    nameKh: "ព្រះសីហនុ",
    type: "province",
    districts: [
      { code: "PS-SK", nameEn: "Sihanoukville", nameKh: "ក្រុងព្រះសីហនុ" },
      { code: "PS-PK", nameEn: "Prey Nob", nameKh: "ព្រៃនប់" },
      { code: "PS-ST", nameEn: "Stung Hav", nameKh: "ស្ទឹងហាវ" },
      { code: "PS-KS", nameEn: "Kampong Seila", nameKh: "កំពង់សីលា" },
    ],
  },
  {
    code: "PV",
    nameEn: "Preah Vihear",
    nameKh: "ព្រះវិហារ",
    type: "province",
    districts: [
      { code: "PV-PV", nameEn: "Preah Vihear", nameKh: "ព្រះវិហារ" },
      { code: "PV-CC", nameEn: "Chey Saen", nameKh: "ជ័យសែន" },
      { code: "PV-CP", nameEn: "Chhaeb", nameKh: "ឆែប" },
      { code: "PV-KL", nameEn: "Kuleaen", nameKh: "គូលែន" },
      { code: "PV-RS", nameEn: "Rovieng", nameKh: "រវៀង" },
      { code: "PV-SG", nameEn: "Sangkom Thmey", nameKh: "សង្គមថ្មី" },
      { code: "PV-TB", nameEn: "Tbeng Meanchey", nameKh: "ត្បែងមានជ័យ" },
      { code: "PV-TC", nameEn: "Tbaeng Mean Chey", nameKh: "ត្បែងមានជ័យ" },
    ],
  },
  {
    code: "PG",
    nameEn: "Prey Veng",
    nameKh: "ព្រៃវែង",
    type: "province",
    districts: [
      { code: "PG-PV", nameEn: "Prey Veng", nameKh: "ព្រៃវែង" },
      { code: "PG-BK", nameEn: "Ba Phnum", nameKh: "បាភ្នំ" },
      { code: "PG-KM", nameEn: "Kamchay Mear", nameKh: "កំចាយមារ" },
      { code: "PG-KC", nameEn: "Kampong Trabaek", nameKh: "កំពង់ត្រាបែក" },
      { code: "PG-KL", nameEn: "Kanhchriech", nameKh: "កញ្ជ្រៀច" },
      { code: "PG-MK", nameEn: "Me Sang", nameKh: "មេសាង" },
      { code: "PG-PK", nameEn: "Peam Chor", nameKh: "ពាមជរ" },
      { code: "PG-PR", nameEn: "Peam Ro", nameKh: "ពាមរ៉" },
      { code: "PG-PB", nameEn: "Pea Reang", nameKh: "ពារាំង" },
      { code: "PG-PS", nameEn: "Preah Sdach", nameKh: "ព្រះស្តេច" },
      { code: "PG-PC", nameEn: "Pea Rieng", nameKh: "ពារាំង" },
      { code: "PG-ST", nameEn: "Sithor Kandal", nameKh: "ស៊ីធរកណ្ដាល" },
      { code: "PG-SS", nameEn: "Svay Antor", nameKh: "ស្វាយអន្ទរ" },
    ],
  },
  {
    code: "PT",
    nameEn: "Pursat",
    nameKh: "ពោធិ៍សាត់",
    type: "province",
    districts: [
      { code: "PT-PT", nameEn: "Pursat", nameKh: "ពោធិ៍សាត់" },
      { code: "PT-BV", nameEn: "Bakan", nameKh: "បាកាន" },
      { code: "PT-KS", nameEn: "Kandieng", nameKh: "កណ្ដៀង" },
      { code: "PT-KM", nameEn: "Krakor", nameKh: "ក្រគរ" },
      { code: "PT-PK", nameEn: "Phnum Kravanh", nameKh: "ភ្នំក្រវាញ" },
      { code: "PT-VR", nameEn: "Veal Veaeng", nameKh: "វាលវែង" },
    ],
  },
  {
    code: "RK",
    nameEn: "Ratanakiri",
    nameKh: "រតនគិរី",
    type: "province",
    districts: [
      { code: "RK-BL", nameEn: "Banlung", nameKh: "បានលុង" },
      { code: "RK-AK", nameEn: "Andoung Meas", nameKh: "អណ្ដូងមាស" },
      { code: "RK-BK", nameEn: "Bar Kaev", nameKh: "បរកែវ" },
      { code: "RK-KH", nameEn: "Koun Mom", nameKh: "គុនមុំ" },
      { code: "RK-LS", nameEn: "Lumphat", nameKh: "លំផាត់" },
      { code: "RK-OR", nameEn: "O Chum", nameKh: "អូរជុំ" },
      { code: "RK-OY", nameEn: "O Yadav", nameKh: "អូរយ៉ាដាវ" },
      { code: "RK-TK", nameEn: "Ta Veaeng", nameKh: "តាវែង" },
      { code: "RK-VK", nameEn: "Veun Sai", nameKh: "វើនសៃ" },
    ],
  },
  {
    code: "SVR",
    nameEn: "Svay Rieng",
    nameKh: "ស្វាយរៀង",
    type: "province",
    districts: [
      { code: "SVR-SR", nameEn: "Svay Rieng", nameKh: "ស្វាយរៀង" },
      { code: "SVR-CP", nameEn: "Chantrea", nameKh: "ចន្រ្ទា" },
      { code: "SVR-KP", nameEn: "Kampong Rou", nameKh: "កំពង់រៅ" },
      { code: "SVR-RK", nameEn: "Romeas Haek", nameKh: "រមាសហែក" },
      { code: "SVR-RM", nameEn: "Rumduol", nameKh: "រំដួល" },
      { code: "SVR-ST", nameEn: "Svay Chrum", nameKh: "ស្វាយជ្រុំ" },
      { code: "SVR-SB", nameEn: "Svay Teap", nameKh: "ស្វាយទាប" },
      { code: "SVR-BC", nameEn: "Bavet", nameKh: "បាវិត" },
    ],
  },
  {
    code: "TK",
    nameEn: "Takeo",
    nameKh: "តាកែវ",
    type: "province",
    districts: [
      { code: "TK-TK", nameEn: "Takeo", nameKh: "តាកែវ" },
      { code: "TK-AK", nameEn: "Angkor Borei", nameKh: "អង្គរបុរី" },
      { code: "TK-BT", nameEn: "Bati", nameKh: "បាតី" },
      { code: "TK-BC", nameEn: "Borei Cholsar", nameKh: "បុរីជលសារ" },
      { code: "TK-KR", nameEn: "Kiri Vong", nameKh: "គីរីវង្ស" },
      { code: "TK-KS", nameEn: "Kaoh Andaet", nameKh: "កោះអណ្ដែត" },
      { code: "TK-PS", nameEn: "Prey Kabas", nameKh: "ព្រៃកប្បាស" },
      { code: "TK-SM", nameEn: "Samraong", nameKh: "សំរោង" },
      { code: "TK-DK", nameEn: "Doun Kaev", nameKh: "ដូនកែវ" },
      { code: "TK-TM", nameEn: "Tram Kak", nameKh: "ត្រាំកក់" },
    ],
  },
  {
    code: "KP",
    nameEn: "Kep",
    nameKh: "កែប",
    type: "province",
    districts: [
      { code: "KP-KP", nameEn: "Kep", nameKh: "កែប" },
      { code: "KP-DV", nameEn: "Damnak Chang'aeur", nameKh: "ដំណាក់ចង្អើរ" },
    ],
  },
  {
    code: "STR",
    nameEn: "Stung Treng",
    nameKh: "ស្ទឹងត្រែង",
    type: "province",
    districts: [
      { code: "STR-ST", nameEn: "Stung Treng", nameKh: "ស្ទឹងត្រែង" },
      { code: "STR-BS", nameEn: "Borei O'Svay Sen Chey", nameKh: "បុរីអូរស្វាយសែនជ័យ" },
      { code: "STR-SS", nameEn: "Sesan", nameKh: "សេសាន" },
      { code: "STR-SK", nameEn: "Siem Bouk", nameKh: "សៀមបុក" },
      { code: "STR-SP", nameEn: "Siem Pang", nameKh: "សៀមប៉ាង" },
      { code: "STR-TL", nameEn: "Thala Barivat", nameKh: "ថាលាបរិវ៉ាត់" },
    ],
  },
  {
    code: "TBK",
    nameEn: "Tboung Khmum",
    nameKh: "ត្បូងឃ្មុំ",
    type: "province",
    districts: [
      { code: "TBK-TK", nameEn: "Tboung Khmum", nameKh: "ត្បូងឃ្មុំ" },
      { code: "TBK-DK", nameEn: "Dambae", nameKh: "ដំបែ" },
      { code: "TBK-KT", nameEn: "Krouch Chhmar", nameKh: "ក្រូចឆ្មារ" },
      { code: "TBK-MP", nameEn: "Memot", nameKh: "មីមត់" },
      { code: "TBK-OR", nameEn: "Ou Reang Ov", nameKh: "អូររាំងឪ" },
      { code: "TBK-PK", nameEn: "Ponhea Kraek", nameKh: "ពញាក្រែក" },
      { code: "TBK-SN", nameEn: "Suong", nameKh: "សួង" },
    ],
  },
  {
    code: "BNP",
    nameEn: "Banteay Meanchey",
    nameKh: "បន្ទាយមានជ័យ",
    type: "province",
    districts: [
      { code: "BNP-SR", nameEn: "Serei Saophoan", nameKh: "សិរីសោភ័ណ" },
      { code: "BNP-MS", nameEn: "Malai", nameKh: "ម៉ាឡៃ" },
      { code: "BNP-MK", nameEn: "Mongkol Borei", nameKh: "មង្គលបុរី" },
      { code: "BNP-PB", nameEn: "Phnum Srok", nameKh: "ភ្នំស្រុក" },
      { code: "BNP-PP", nameEn: "Preah Net Preah", nameKh: "ព្រះនេត្រព្រះ" },
      { code: "BNP-OC", nameEn: "Ou Chrov", nameKh: "អូរជ្រៅ" },
      { code: "BNP-SS", nameEn: "Svay Chek", nameKh: "ស្វាយចេក" },
      { code: "BNP-TP", nameEn: "Thma Puok", nameKh: "ថ្មពួក" },
      { code: "BNP-PM", nameEn: "Poipet", nameKh: "ប៉ោយប៉ែត" },
    ],
  },
];

// Helper to get province by code
export function getProvinceByCode(code: string): Province | undefined {
  return CAMBODIA_PROVINCES.find((p) => p.code === code);
}

// Helper to get all province codes
export function getAllProvinceCodes(): string[] {
  return CAMBODIA_PROVINCES.map((p) => p.code);
}

// Helper to get all district codes for a province
export function getDistrictCodesForProvince(provinceCode: string): string[] {
  const province = getProvinceByCode(provinceCode);
  return province ? province.districts.map((d) => d.code) : [];
}

// Helper to find region (province or district) by code
export function findRegionByCode(
  code: string
): { province: Province; district?: District } | undefined {
  // Check if it's a province code
  const province = getProvinceByCode(code);
  if (province) {
    return { province };
  }

  // Check if it's a district code (format: XX-XX)
  if (code.includes("-")) {
    const provinceCode = code.split("-")[0];
    const province = getProvinceByCode(provinceCode);
    if (province) {
      const district = province.districts.find((d) => d.code === code);
      if (district) {
        return { province, district };
      }
    }
  }

  return undefined;
}

// Pre-defined shipping zone groups for convenience
export const SHIPPING_ZONE_PRESETS = {
  phnomPenh: ["PP"],
  centralProvinces: ["KD", "KPS", "KCH", "TK", "PG"],
  southernProvinces: ["KPT", "KP", "PS", "KK"],
  northwestProvinces: ["SR", "BTB", "BNP", "OD", "PL"],
  northernProvinces: ["KTM", "PV", "PT"],
  easternProvinces: ["SVR", "KCM", "TBK", "KT", "STR", "MK", "RK"],
  allProvinces: getAllProvinceCodes(),
};
