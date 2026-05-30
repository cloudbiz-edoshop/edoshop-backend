import { ProductStoreType } from "./product-store-types.constants";

export enum Products {
  BASIC_TEE = "Basic Tee",
  SPORT_SHOES = "Sport Shoes",
  DENIM_JACKET = "Denim Jacket",
  SUMMER_DRESS = "Summer Dress",
  LEATHER_BAG = "Leather Bag",
  SMART_WATCH = "Smart Watch",
}

export const PRODUCTS = [
  {
    storeId: 1,
    seriesId: 1, // PK_A01_B1_S1 (Alpha Series)
    categoryId: 1, // Men
    name: Products.BASIC_TEE,
    price: "19.99",
    shortDescription: "A comfortable basic cotton tee.",
    fullDescription: "100% organic cotton tee, soft and breathable.",
    specifications: "Material: Cotton\nSizes: XS–XXL\nColor: Multiple",
    version: 1,
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    productType: ProductStoreType.DIRECT_ORDER,
    // Direct Order: DO_PK_A01_B1_P1 (where PK_A01_B1 is bundle code)
    directOrderCode: "DO_PK_A01_B1_P1",
  },
  {
    storeId: 1,
    seriesId: 1, // PK_A01_B1_S1 (Alpha Series)
    categoryId: 5, // Shoes
    name: Products.SPORT_SHOES,
    price: "59.99",
    shortDescription: "Lightweight running shoes for everyday fitness.",
    fullDescription: "Engineered for performance and comfort on the go.",
    specifications: "Material: Mesh\nWeight: 0.8kg\nSizes: 6–12",
    version: 1,
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    productType: ProductStoreType.DIRECT_ORDER,
    // Direct Order: DO_PK_A01_B1_P2
    directOrderCode: "DO_PK_A01_B1_P2",
  },
  {
    storeId: 2,
    seriesId: 3, // PK_A01_B2_S1 (Gamma Series) - connected to entry with supplier PK_A01
    categoryId: 1, // Men
    name: Products.DENIM_JACKET,
    price: "79.99",
    shortDescription: "Classic blue denim jacket with modern fit.",
    fullDescription: "Modern fit denim jacket, timeless and versatile.",
    specifications: "Material: Denim\nColor: Blue, Black\nSizes: S–XL",
    version: 1,
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    productType: ProductStoreType.DROPSHIPPING,
    // Drop-shipping: DS_PK_A01_MEN_P1 (where PK_A01 is supplier code, MEN is category code)
    dropshippingCode: "DS_PK_A01_MEN_P1",
    totalItems: 50,
    groupCriteriaId: 1, // MOQ
    completionCriteria: "100.00",
  },
  {
    storeId: 2,
    seriesId: 4, // PK_A01_B2_S2 (Delta Series) - connected to entry with supplier PK_A01
    categoryId: 2, // Women
    name: Products.SUMMER_DRESS,
    price: "49.99",
    shortDescription: "Breezy summer dress perfect for warm days.",
    fullDescription: "Elegant floral summer dress perfect for warm outings.",
    specifications: "Material: Linen/Cotton\nSizes: XS–L\nColors: Pastel",
    version: 1,
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    productType: ProductStoreType.DROPSHIPPING,
    // Drop-shipping: DS_PK_A01_WOM_P1
    dropshippingCode: "DS_PK_A01_WOM_P1",
    totalItems: 30,
    groupCriteriaId: 1, // MOQ
    completionCriteria: "75.00",
  },
  {
    storeId: 2,
    seriesId: 5, // PK_A01_B3_S1 (Epsilon Series) - connected to entry with supplier PK_A01
    categoryId: 4, // Accessories
    name: Products.LEATHER_BAG,
    price: "129.99",
    shortDescription: "Stylish and durable leather shoulder bag.",
    fullDescription: "Handcrafted genuine leather bag with premium finish.",
    specifications: "Material: Leather\nCapacity: 15L\nColor: Brown/Black",
    version: 1,
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    productType: ProductStoreType.DROPSHIPPING,
    // Drop-shipping: DS_PK_A01_ACC_P1
    dropshippingCode: "DS_PK_A01_ACC_P1",
    totalItems: 25,
    groupCriteriaId: 1, // MOQ
    completionCriteria: "50.00",
  },
  {
    storeId: 2,
    seriesId: 5, // PK_A01_B3_S1 (Epsilon Series) - connected to entry with supplier PK_A01
    categoryId: 6, // Electronics
    name: Products.SMART_WATCH,
    price: "199.99",
    shortDescription: "Feature-rich smartwatch with fitness tracking.",
    fullDescription: "Smartwatch with fitness, health, and mobile sync.",
    specifications: "Battery: 36hr\nWaterproof: Yes\nSensors: HR, GPS, O2",
    version: 1,
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    productType: ProductStoreType.DROPSHIPPING,
    // Drop-shipping: DS_PK_A01_ELE_P1
    dropshippingCode: "DS_PK_A01_ELE_P1",
    totalItems: 20,
    groupCriteriaId: 1, // MOQ
    completionCriteria: "25.00",
  },
  {
    storeId: 1,
    seriesId: 1,
    categoryId: 1,
    name: Products.DENIM_JACKET,
    price: "74.99",
    shortDescription: "Classic denim jacket with a vintage look.",
    fullDescription: "Durable denim jacket with a timeless vintage style.",
    specifications: "Material: Denim\nColor: Blue\nSizes: S–XL",
    version: 1,
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    directOrderCode: "DO_PK_A01_B1_P3",
  },
  {
    storeId: 2,
    seriesId: 2,
    categoryId: 2,
    name: Products.SPORT_SHOES,
    price: "64.99",
    shortDescription: "High-performance sport shoes for athletes.",
    fullDescription: "Advanced sport shoes designed for maximum performance.",
    specifications: "Material: Synthetic\nWeight: 0.75kg\nSizes: 6–12",
    version: 1,
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    dropshippingCode: "DS_PK_A01_MEN_P2",
    totalItems: 40,
    groupCriteriaId: 2,
    completionCriteria: "80.00",
  },

];
