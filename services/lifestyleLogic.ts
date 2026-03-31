
import { Property, Vehicle, ClothingItem, BusinessType, Commitment, Stats, ActorSkills, Genre, ImprovementOption, ImprovementActivity } from '../types';

// --- CUSTOMIZATION OPTIONS ---

export interface CustomizationOption {
    id: string;
    label: string;
    description: string;
    costMultiplier?: number; // Percentage of base price (0.1 = 10%)
    flatCost?: number;       // Flat additional cost
    statBonus?: Partial<Stats> & { moodBonus?: number; reputationBonus?: number };
    type: 'STYLE' | 'PERFORMANCE' | 'INTERIOR' | 'EXTERIOR' | 'FEATURE';
}

export const PROPERTY_CUSTOMIZATIONS: CustomizationOption[] = [
    { id: 'int_minimal', label: 'Minimalist Interior', description: 'Clean lines, modern feel.', costMultiplier: 0.05, statBonus: { moodBonus: 1 }, type: 'INTERIOR' },
    { id: 'int_royal', label: 'Royal Furnishings', description: 'Gold leaf and velvet everywhere.', costMultiplier: 0.25, statBonus: { moodBonus: 2 }, type: 'INTERIOR' },
    { id: 'feat_pool', label: 'Infinity Pool', description: 'Stunning views.', flatCost: 50000, statBonus: { moodBonus: 2 }, type: 'FEATURE' },
    { id: 'feat_gym', label: 'Home Gym', description: 'Private workout space.', flatCost: 15000, statBonus: { health: 1 }, type: 'FEATURE' },
    { id: 'feat_cinema', label: 'Private Cinema', description: 'Watch dailies in style.', flatCost: 30000, statBonus: { happiness: 1 }, type: 'FEATURE' },
    { id: 'sec_high', label: 'High-Tech Security', description: 'Biometric locks and cameras.', flatCost: 10000, type: 'FEATURE' },
];

export const VEHICLE_CUSTOMIZATIONS: CustomizationOption[] = [
    { id: 'col_matte', label: 'Matte Black Wrap', description: 'Stealth look.', flatCost: 5000, statBonus: { reputationBonus: 1 }, type: 'STYLE' },
    { id: 'col_chrome', label: 'Chrome Wrap', description: 'Flashy and loud.', flatCost: 8000, statBonus: { reputationBonus: 2 }, type: 'STYLE' },
    { id: 'eng_turbo', label: 'Stage 2 Tuning', description: 'Increased horsepower.', costMultiplier: 0.15, statBonus: { reputationBonus: 2 }, type: 'PERFORMANCE' },
    { id: 'whl_forged', label: 'Forged Rims', description: 'Lightweight luxury wheels.', flatCost: 4000, statBonus: { reputationBonus: 1 }, type: 'EXTERIOR' },
    { id: 'int_leather', label: 'Custom Leather', description: 'Hand-stitched interior.', costMultiplier: 0.1, type: 'INTERIOR' }
];

// --- MARKETPLACE CATALOGS ---

export const PROPERTY_CATALOG: Property[] = [
    // LOS ANGELES (The Base)
    { id: 'prop_apt_1', name: 'Silver Lake Studio', type: 'Property', price: 85000, weeklyExpense: 600, moodBonus: 2, location: 'Los Angeles', address: '404 Micheltorena St' },
    { id: 'prop_starter_condo', name: 'West Hollywood Condo', type: 'Property', price: 650000, weeklyExpense: 1200, moodBonus: 3, location: 'Los Angeles', address: '1200 N Sweetzer Ave' },
    { id: 'prop_la_loft', name: 'Downtown Artist Loft', type: 'Property', price: 1500000, weeklyExpense: 2500, moodBonus: 4, location: 'Los Angeles', address: '849 S Broadway' },
    { id: 'prop_suburban_house', name: 'Sherman Oaks House', type: 'Property', price: 2200000, weeklyExpense: 3500, moodBonus: 5, location: 'Los Angeles', address: '4521 Woodman Ave' },
    { id: 'prop_hollywood_hills_home', name: 'Hollywood Hills Villa', type: 'Property', price: 6500000, weeklyExpense: 8000, moodBonus: 8, location: 'Los Angeles', address: '8822 Appian Way' },
    { id: 'prop_beverly_hills_mansion', name: 'Beverly Hills Estate', type: 'Property', price: 45000000, weeklyExpense: 45000, moodBonus: 18, location: 'Los Angeles', address: '1001 Roxbury Dr' },
    { id: 'prop_malibu_beach_house', name: 'Malibu Glass House', type: 'Property', price: 85000000, weeklyExpense: 65000, moodBonus: 22, location: 'Los Angeles', address: '22300 Pacific Coast Hwy' },
    { id: 'prop_the_one', name: "'The One' Bel Air", type: 'Property', price: 350000000, weeklyExpense: 250000, moodBonus: 35, location: 'Los Angeles', address: '924 Bel Air Rd' },

    // NEW YORK (The Hustle)
    { id: 'prop_brooklyn_brownstone', name: 'Park Slope Brownstone', type: 'Property', price: 4500000, weeklyExpense: 5000, moodBonus: 7, location: 'New York', address: '142 Berkeley Pl, Brooklyn' },
    { id: 'prop_manhattan_penthouse', name: 'TriBeCa Penthouse', type: 'Property', price: 32000000, weeklyExpense: 25000, moodBonus: 15, location: 'New York', address: '56 Leonard St' },
    { id: 'prop_nyc_billionaire', name: 'Central Park Tower', type: 'Property', price: 120000000, weeklyExpense: 85000, moodBonus: 25, location: 'New York', address: '217 West 57th St' },

    // PARIS (The Romance)
    { id: 'prop_paris_marais', name: 'Le Marais Apartment', type: 'Property', price: 2800000, weeklyExpense: 3000, moodBonus: 7, location: 'Paris', address: '12 Rue des Rosiers' },
    { id: 'prop_paris_eiffel', name: 'Eiffel View Penthouse', type: 'Property', price: 28000000, weeklyExpense: 20000, moodBonus: 16, location: 'Paris', address: '22 Avenue de Camoens' },
    { id: 'prop_chateau_france', name: 'Château de Villette', type: 'Property', price: 180000000, weeklyExpense: 120000, moodBonus: 30, location: 'France', address: 'Condécourt, Val-d\'Oise' },

    // LONDON (The Legacy)
    { id: 'prop_london_notting', name: 'Notting Hill Flat', type: 'Property', price: 5500000, weeklyExpense: 6000, moodBonus: 8, location: 'London', address: '28 Portobello Road' },
    { id: 'prop_london_townhouse', name: 'Mayfair Townhouse', type: 'Property', price: 145000000, weeklyExpense: 110000, moodBonus: 28, location: 'London', address: '44 Berkeley Square' },

    // TOKYO (The Future)
    { id: 'prop_tokyo_shibuya', name: 'Shibuya High-Rise', type: 'Property', price: 8500000, weeklyExpense: 9000, moodBonus: 10, location: 'Tokyo', address: '2-24-12 Shibuya' },

    // DUBAI (The Elite)
    { id: 'prop_dubai_palm', name: 'Palm Jumeirah Villa', type: 'Property', price: 25000000, weeklyExpense: 18000, moodBonus: 14, location: 'Dubai', address: 'Frond N, Palm Jumeirah' },
    { id: 'prop_dubai_royal', name: 'Royal Atlantis Penthouse', type: 'Property', price: 150000000, weeklyExpense: 90000, moodBonus: 26, location: 'Dubai', address: 'Palm Jumeirah Crescent' },

    // VACATION / ULTRA LUXE
    { id: 'prop_miami_beachfront', name: 'Miami Condo', type: 'Property', price: 12000000, weeklyExpense: 12000, moodBonus: 10, location: 'Miami', address: '100 S Pointe Dr' },
    { id: 'prop_aspen_chalet', name: 'Aspen Ski Chalet', type: 'Property', price: 18500000, weeklyExpense: 15000, moodBonus: 12, location: 'Aspen', address: '600 E Hopkins Ave' },
    { id: 'prop_private_island', name: 'Necker Island', type: 'Property', price: 600000000, weeklyExpense: 500000, moodBonus: 50, location: 'Caribbean', address: 'British Virgin Islands' },
    { id: 'prop_monaco_penthouse', name: 'Tour Odéon Sky Penthouse', type: 'Property', price: 440000000, weeklyExpense: 350000, moodBonus: 45, location: 'Monaco', address: 'La Rousse/Saint-Roman' },
];

export const CAR_CATALOG: Vehicle[] = [
    { id: 'veh_car_civic', name: 'Honda Civic', type: 'Vehicle', vehicleType: 'Car', price: 45000, reputationBonus: 1, energySave: 2 },
    { id: 'veh_car_tesla3', name: 'Tesla Model 3', type: 'Vehicle', vehicleType: 'Car', price: 85000, reputationBonus: 3, energySave: 4 },
    { id: 'veh_car_mustang', name: 'Ford Mustang GT', type: 'Vehicle', vehicleType: 'Car', price: 110000, reputationBonus: 4, energySave: 3 },
    { id: 'veh_car_porsche911', name: 'Porsche 911 Turbo S', type: 'Vehicle', vehicleType: 'Car', price: 350000, reputationBonus: 10, energySave: 5 },
    { id: 'veh_car_teslas', name: 'Tesla Model S Plaid', type: 'Vehicle', vehicleType: 'Car', price: 220000, reputationBonus: 8, energySave: 6 },
    { id: 'veh_car_gwagon', name: 'Mercedes G-Wagon', type: 'Vehicle', vehicleType: 'Car', price: 450000, reputationBonus: 12, energySave: 4 },
    { id: 'veh_car_ferrari488', name: 'Ferrari F8 Tributo', type: 'Vehicle', vehicleType: 'Car', price: 750000, reputationBonus: 18, energySave: 6 },
    { id: 'veh_car_rr_cullinan', name: 'Rolls-Royce Cullinan', type: 'Vehicle', vehicleType: 'Car', price: 950000, reputationBonus: 22, energySave: 8 },
    { id: 'veh_car_bugatti', name: 'Bugatti Chiron', type: 'Vehicle', vehicleType: 'Car', price: 5500000, reputationBonus: 35, energySave: 7 },
    
    // NEW COLLECTABLES
    { id: 'veh_car_koenigsegg', name: 'Koenigsegg Jesko', type: 'Vehicle', vehicleType: 'Car', price: 8000000, reputationBonus: 45, energySave: 9 },
    { id: 'veh_car_vintage_ferrari', name: '1963 Ferrari 250 GTO', type: 'Vehicle', vehicleType: 'Car', price: 70000000, reputationBonus: 100, energySave: 5 }, // Ultimate Flex
    { id: 'veh_car_pagani', name: 'Pagani Zonda HP', type: 'Vehicle', vehicleType: 'Car', price: 17500000, reputationBonus: 60, energySave: 8 },
];

export const MOTORCYCLE_CATALOG: Vehicle[] = [
    { id: 'veh_bike_vespa', name: 'Vespa Primavera', type: 'Vehicle', vehicleType: 'Motorcycle', price: 12000, reputationBonus: 1, energySave: 1 },
    { id: 'veh_bike_honda_rebel', name: 'Honda Rebel 500', type: 'Vehicle', vehicleType: 'Motorcycle', price: 18000, reputationBonus: 2, energySave: 2 },
    { id: 'veh_bike_yamaha_r1', name: 'Yamaha R1', type: 'Vehicle', vehicleType: 'Motorcycle', price: 45000, reputationBonus: 5, energySave: 3 },
    { id: 'veh_bike_harley', name: 'Harley-Davidson Fat Boy', type: 'Vehicle', vehicleType: 'Motorcycle', price: 65000, reputationBonus: 7, energySave: 2 },
    { id: 'veh_bike_ducati', name: 'Ducati Panigale V4 R', type: 'Vehicle', vehicleType: 'Motorcycle', price: 90000, reputationBonus: 10, energySave: 4 },
    { id: 'veh_bike_arch', name: 'Arch KRGT-1', type: 'Vehicle', vehicleType: 'Motorcycle', price: 180000, reputationBonus: 15, energySave: 5 }, // Keanu's bike brand equivalent
];

export const BOAT_CATALOG: Vehicle[] = [
    { id: 'veh_boat_jetski', name: 'Sea-Doo GTX', type: 'Vehicle', vehicleType: 'Boat', price: 35000, reputationBonus: 3, energySave: 1 },
    { id: 'veh_boat_mastercraft', name: 'MasterCraft XStar', type: 'Vehicle', vehicleType: 'Boat', price: 350000, reputationBonus: 8, energySave: 2 },
    { id: 'veh_boat_yacht', name: 'Sunseeker 90', type: 'Vehicle', vehicleType: 'Boat', price: 12000000, reputationBonus: 25, energySave: 5 },
    { id: 'veh_boat_superyacht', name: 'Project Azzam', type: 'Vehicle', vehicleType: 'Boat', price: 600000000, reputationBonus: 100, energySave: 10 }, // NEW
];

export const AIRCRAFT_CATALOG: Vehicle[] = [
    { id: 'veh_plane_cessna', name: 'Cessna 172', type: 'Vehicle', vehicleType: 'Aircraft', price: 850000, reputationBonus: 10, energySave: 10 },
    { id: 'veh_plane_cirrus', name: 'Cirrus Vision Jet', type: 'Vehicle', vehicleType: 'Aircraft', price: 6500000, reputationBonus: 30, energySave: 15 },
    { id: 'veh_plane_gulfstream', name: 'Gulfstream G700', type: 'Vehicle', vehicleType: 'Aircraft', price: 120000000, reputationBonus: 60, energySave: 25 },
    { id: 'veh_plane_bbj', name: 'Boeing Business Jet', type: 'Vehicle', vehicleType: 'Aircraft', price: 450000000, reputationBonus: 90, energySave: 30 }, // NEW
];


export const CLOTHING_CATALOG: ClothingItem[] = [
    // --- OUTFITS (Suits, Dresses, Full Sets) ---
    { id: 'cloth_outfit_tracksuit', name: 'Velour Tracksuit', category: 'OUTFIT', type: 'Clothing', price: 850, style: 'Casual', auditionBonus: 0.3 },
    { id: 'cloth_outfit_linen', name: 'Linen Summer Suit', category: 'OUTFIT', type: 'Clothing', price: 3500, style: 'Premium', auditionBonus: 1.0 },
    { id: 'cloth_outfit_tux_cheap', name: 'Rental Tuxedo', category: 'OUTFIT', type: 'Clothing', price: 1200, style: 'Premium', auditionBonus: 0.5 },
    { id: 'cloth_outfit_tux_armani', name: 'Armani Tuxedo', category: 'OUTFIT', type: 'Clothing', price: 15000, style: 'Luxury', auditionBonus: 2.5 },
    { id: 'cloth_outfit_tom_ford', name: 'Tom Ford Shelton Suit', category: 'OUTFIT', type: 'Clothing', price: 18000, style: 'Luxury', auditionBonus: 2.8 },
    { id: 'cloth_outfit_brioni', name: 'Brioni Bespoke Suit', category: 'OUTFIT', type: 'Clothing', price: 25000, style: 'Luxury', auditionBonus: 3.2 },
    { id: 'cloth_outfit_dress_chanel', name: 'Chanel Evening Gown', category: 'OUTFIT', type: 'Clothing', price: 45000, style: 'Luxury', auditionBonus: 3.5 },
    { id: 'cloth_outfit_dress_dior', name: 'Dior Haute Couture', category: 'OUTFIT', type: 'Clothing', price: 85000, style: 'Luxury', auditionBonus: 4.0 },
    { id: 'cloth_outfit_met_gala', name: 'Avant-Garde Piece', category: 'OUTFIT', type: 'Clothing', price: 250000, style: 'Luxury', auditionBonus: 5.0 },
    { id: 'cloth_outfit_balmain', name: 'Balmain Embellished', category: 'OUTFIT', type: 'Clothing', price: 65000, style: 'Luxury', auditionBonus: 3.0 },
    
    // COLLECTABLE OUTFITS
    { id: 'cloth_outfit_marilyn', name: 'Marilyn\'s Crystal Dress', category: 'OUTFIT', type: 'Clothing', price: 4800000, style: 'Luxury', auditionBonus: 8.0 },
    { id: 'cloth_outfit_mj_jacket', name: 'Thriller Jacket', category: 'OUTFIT', type: 'Clothing', price: 1800000, style: 'Luxury', auditionBonus: 7.0 },

    // --- TOPS ---
    { id: 'cloth_top_tee_white', name: 'Plain White Tee', category: 'TOP', type: 'Clothing', price: 150, style: 'Casual', auditionBonus: 0.1 },
    { id: 'cloth_top_off_white', name: 'Off-White Arrow Tee', category: 'TOP', type: 'Clothing', price: 1200, style: 'Casual', auditionBonus: 0.5 },
    { id: 'cloth_top_hoodie_supreme', name: 'Supreme Box Logo', category: 'TOP', type: 'Clothing', price: 2500, style: 'Casual', auditionBonus: 0.6 },
    { id: 'cloth_top_palm_angels', name: 'Palm Angels Track Jacket', category: 'TOP', type: 'Clothing', price: 1800, style: 'Casual', auditionBonus: 0.6 },
    { id: 'cloth_top_denim_jacket', name: 'Vintage Denim Jacket', category: 'TOP', type: 'Clothing', price: 850, style: 'Casual', auditionBonus: 0.3 },
    { id: 'cloth_top_givenchy', name: 'Givenchy Hoodie', category: 'TOP', type: 'Clothing', price: 3200, style: 'Premium', auditionBonus: 0.9 },
    { id: 'cloth_top_leather_jacket', name: 'Saint Laurent Jacket', category: 'TOP', type: 'Clothing', price: 12000, style: 'Luxury', auditionBonus: 2.0 },
    { id: 'cloth_top_silk_shirt', name: 'Versace Silk Shirt', category: 'TOP', type: 'Clothing', price: 4500, style: 'Premium', auditionBonus: 1.2 },
    { id: 'cloth_top_burberry_coat', name: 'Burberry Trench', category: 'TOP', type: 'Clothing', price: 8500, style: 'Premium', auditionBonus: 1.5 },
    { id: 'cloth_top_prada_shirt', name: 'Prada Re-Nylon Shirt', category: 'TOP', type: 'Clothing', price: 5000, style: 'Luxury', auditionBonus: 1.4 },

    // --- BOTTOMS ---
    { id: 'cloth_bot_jeans_levis', name: 'Levi\'s 501s', category: 'BOTTOM', type: 'Clothing', price: 250, style: 'Casual', auditionBonus: 0.2 },
    { id: 'cloth_bot_sweats_nike', name: 'Nike Tech Fleece', category: 'BOTTOM', type: 'Clothing', price: 350, style: 'Casual', auditionBonus: 0.2 },
    { id: 'cloth_bot_essentials', name: 'Fear of God Sweats', category: 'BOTTOM', type: 'Clothing', price: 850, style: 'Casual', auditionBonus: 0.4 },
    { id: 'cloth_bot_amiri', name: 'Amiri MX1 Jeans', category: 'BOTTOM', type: 'Clothing', price: 3500, style: 'Premium', auditionBonus: 1.2 },
    { id: 'cloth_bot_chino_rl', name: 'Ralph Lauren Chinos', category: 'BOTTOM', type: 'Clothing', price: 550, style: 'Premium', auditionBonus: 0.5 },
    { id: 'cloth_bot_thom_browne', name: 'Thom Browne Shorts', category: 'BOTTOM', type: 'Clothing', price: 2200, style: 'Luxury', auditionBonus: 1.0 },
    { id: 'cloth_bot_leather_pants', name: 'Rick Owens Pants', category: 'BOTTOM', type: 'Clothing', price: 4500, style: 'Luxury', auditionBonus: 1.5 },
    { id: 'cloth_bot_skirt_gucci', name: 'Gucci Midi Skirt', category: 'BOTTOM', type: 'Clothing', price: 6500, style: 'Luxury', auditionBonus: 1.8 },

    // --- SHOES ---
    { id: 'cloth_shoe_vans', name: 'Vans Old Skool', category: 'SHOES', type: 'Clothing', price: 180, style: 'Casual', auditionBonus: 0.1 },
    { id: 'cloth_shoe_crocs', name: 'Crocs Classic', category: 'SHOES', type: 'Clothing', price: 120, style: 'Casual', auditionBonus: -0.1 },
    { id: 'cloth_shoe_dunk', name: 'Nike Dunk Low Panda', category: 'SHOES', type: 'Clothing', price: 550, style: 'Casual', auditionBonus: 0.3 },
    { id: 'cloth_shoe_jordan1', name: 'Jordan 1 Chicago', category: 'SHOES', type: 'Clothing', price: 8500, style: 'Casual', auditionBonus: 1.0 },
    { id: 'cloth_shoe_yeezy', name: 'Yeezy Boost 350', category: 'SHOES', type: 'Clothing', price: 1200, style: 'Casual', auditionBonus: 0.5 },
    { id: 'cloth_shoe_boots_doc', name: 'Dr. Martens', category: 'SHOES', type: 'Clothing', price: 450, style: 'Casual', auditionBonus: 0.4 },
    { id: 'cloth_shoe_balenciaga', name: 'Balenciaga Triple S', category: 'SHOES', type: 'Clothing', price: 3200, style: 'Premium', auditionBonus: 1.2 },
    { id: 'cloth_shoe_loafers_gucci', name: 'Gucci Loafers', category: 'SHOES', type: 'Clothing', price: 2800, style: 'Premium', auditionBonus: 1.0 },
    { id: 'cloth_shoe_heels_loub', name: 'Louboutin Heels', category: 'SHOES', type: 'Clothing', price: 3500, style: 'Luxury', auditionBonus: 1.5 },
    { id: 'cloth_shoe_oxford_tf', name: 'Tom Ford Oxfords', category: 'SHOES', type: 'Clothing', price: 6500, style: 'Luxury', auditionBonus: 1.8 },
    { id: 'cloth_shoe_mags', name: 'Nike Air Mag', category: 'SHOES', type: 'Clothing', price: 150000, style: 'Luxury', auditionBonus: 3.5 }, // Collectable

    // --- ACCESSORIES: EYEWEAR ---
    { id: 'cloth_acc_rayban', name: 'Ray-Ban Aviators', category: 'ACCESSORY', subCategory: 'EYEWEAR', type: 'Clothing', price: 550, style: 'Casual', auditionBonus: 0.3 },
    { id: 'cloth_acc_oakley', name: 'Oakley Sunglasses', category: 'ACCESSORY', subCategory: 'EYEWEAR', type: 'Clothing', price: 450, style: 'Casual', auditionBonus: 0.2 },
    { id: 'cloth_acc_persol', name: 'Persol 714', category: 'ACCESSORY', subCategory: 'EYEWEAR', type: 'Clothing', price: 850, style: 'Premium', auditionBonus: 0.5 },
    { id: 'cloth_acc_gucci_shades', name: 'Gucci Oversized', category: 'ACCESSORY', subCategory: 'EYEWEAR', type: 'Clothing', price: 1200, style: 'Premium', auditionBonus: 0.7 },
    { id: 'cloth_acc_jacques', name: 'Jacques Marie Mage', category: 'ACCESSORY', subCategory: 'EYEWEAR', type: 'Clothing', price: 2500, style: 'Luxury', auditionBonus: 1.2 },
    { id: 'cloth_acc_cartier_glasses', name: 'Cartier Rimless', category: 'ACCESSORY', subCategory: 'EYEWEAR', type: 'Clothing', price: 3500, style: 'Luxury', auditionBonus: 1.5 },
    { id: 'cloth_acc_chrome', name: 'Chrome Hearts', category: 'ACCESSORY', subCategory: 'EYEWEAR', type: 'Clothing', price: 5000, style: 'Luxury', auditionBonus: 2.0 },

    // --- ACCESSORIES: WATCHES ---
    { id: 'cloth_acc_applewatch', name: 'Apple Watch Ultra', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 1800, style: 'Casual', auditionBonus: 0.4 },
    { id: 'cloth_acc_rolex', name: 'Rolex Daytona', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 120000, style: 'Luxury', auditionBonus: 3.0 },
    { id: 'cloth_acc_ap', name: 'AP Royal Oak', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 185000, style: 'Luxury', auditionBonus: 4.0 },
    { id: 'cloth_acc_richard_mille', name: 'Richard Mille RM', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 850000, style: 'Luxury', auditionBonus: 6.0 },
    { id: 'cloth_acc_patek', name: 'Patek Philippe Nautilus', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 450000, style: 'Luxury', auditionBonus: 5.0 },
    { id: 'cloth_acc_jacob', name: 'Jacob & Co Astronomia', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 650000, style: 'Luxury', auditionBonus: 5.5 },
    { id: 'cloth_acc_vintage_rolex', name: 'Paul Newman Daytona', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 1500000, style: 'Luxury', auditionBonus: 8.0 },
    { id: 'cloth_acc_omega', name: 'Omega Speedmaster', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 8500, style: 'Premium', auditionBonus: 1.2 },
    { id: 'cloth_acc_cartier_tank', name: 'Cartier Tank', category: 'ACCESSORY', subCategory: 'WATCH', type: 'Clothing', price: 6000, style: 'Premium', auditionBonus: 1.0 },

    // --- ACCESSORIES: BAGS ---
    { id: 'cloth_acc_lv_bag', name: 'LV Keepall Bag', category: 'ACCESSORY', subCategory: 'BAG', type: 'Clothing', price: 8500, style: 'Premium', auditionBonus: 1.2 },
    { id: 'cloth_acc_birkin', name: 'Hermès Birkin', category: 'ACCESSORY', subCategory: 'BAG', type: 'Clothing', price: 85000, style: 'Luxury', auditionBonus: 4.0 },
    { id: 'cloth_acc_dior_saddle', name: 'Dior Saddle Bag', category: 'ACCESSORY', subCategory: 'BAG', type: 'Clothing', price: 4200, style: 'Premium', auditionBonus: 0.9 },
    { id: 'cloth_acc_chanel_flap', name: 'Chanel Classic Flap', category: 'ACCESSORY', subCategory: 'BAG', type: 'Clothing', price: 12000, style: 'Luxury', auditionBonus: 2.2 },
    { id: 'cloth_acc_prada_tote', name: 'Prada Tote', category: 'ACCESSORY', subCategory: 'BAG', type: 'Clothing', price: 3500, style: 'Premium', auditionBonus: 0.8 },
    { id: 'cloth_acc_bottega', name: 'Bottega Veneta Pouch', category: 'ACCESSORY', subCategory: 'BAG', type: 'Clothing', price: 5500, style: 'Luxury', auditionBonus: 1.1 },
    { id: 'cloth_acc_goyard', name: 'Goyard Trunk', category: 'ACCESSORY', subCategory: 'BAG', type: 'Clothing', price: 65000, style: 'Luxury', auditionBonus: 3.5 },
    { id: 'cloth_acc_sl_clutch', name: 'YSL Clutch', category: 'ACCESSORY', subCategory: 'BAG', type: 'Clothing', price: 2800, style: 'Premium', auditionBonus: 0.7 },

    // --- ACCESSORIES: JEWELRY ---
    { id: 'cloth_acc_cartier', name: 'Cartier Love Bracelet', category: 'ACCESSORY', subCategory: 'JEWELRY', type: 'Clothing', price: 22000, style: 'Luxury', auditionBonus: 1.5 },
    { id: 'cloth_acc_diamond_ring', name: 'Pink Star Diamond Ring', category: 'ACCESSORY', subCategory: 'JEWELRY', type: 'Clothing', price: 25000000, style: 'Luxury', auditionBonus: 10.0 },
    { id: 'cloth_acc_crown', name: 'Crown of the Empire', category: 'ACCESSORY', subCategory: 'JEWELRY', type: 'Clothing', price: 10000000, style: 'Luxury', auditionBonus: 9.0 },
    { id: 'cloth_acc_vca', name: 'Van Cleef Necklace', category: 'ACCESSORY', subCategory: 'JEWELRY', type: 'Clothing', price: 18000, style: 'Luxury', auditionBonus: 1.4 },
    { id: 'cloth_acc_tiffany', name: 'Tiffany Diamond Studs', category: 'ACCESSORY', subCategory: 'JEWELRY', type: 'Clothing', price: 8500, style: 'Premium', auditionBonus: 0.9 },
    { id: 'cloth_acc_bulgari', name: 'Bulgari Serpenti', category: 'ACCESSORY', subCategory: 'JEWELRY', type: 'Clothing', price: 35000, style: 'Luxury', auditionBonus: 2.5 },
    { id: 'cloth_acc_harry_winston', name: 'Harry Winston Necklace', category: 'ACCESSORY', subCategory: 'JEWELRY', type: 'Clothing', price: 150000, style: 'Luxury', auditionBonus: 4.5 },
    { id: 'cloth_acc_chopard', name: 'Chopard Cufflinks', category: 'ACCESSORY', subCategory: 'JEWELRY', type: 'Clothing', price: 12000, style: 'Luxury', auditionBonus: 1.2 },
];

export const WORKSHOP_CATALOG: Commitment[] = [
    // BASIC
    { 
        id: 'ws_intro_acting', name: 'Intro to Acting', type: 'COURSE', 
        energyCost: 15, income: 0, weeklyCost: 0, upfrontCost: 400, 
        totalDuration: 4, weeksCompleted: 0,
        skillGains: { discipline: 0.2, memorization: 0.2 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_vocal', name: 'Vocal Control', type: 'COURSE', 
        energyCost: 15, income: 0, weeklyCost: 0, upfrontCost: 800, 
        totalDuration: 4, weeksCompleted: 0,
        skillGains: { delivery: 0.4, presence: 0.1 },
        payoutType: 'WEEKLY'
    },
    // INTERMEDIATE
    { 
        id: 'ws_dialogue', name: 'Scene Study', type: 'COURSE', 
        energyCost: 20, weeklyCost: 0, income: 0, upfrontCost: 1500, 
        totalDuration: 6, weeksCompleted: 0,
        skillGains: { delivery: 0.3, expression: 0.3 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_improv_club', name: 'Improv Troupe', type: 'COURSE', 
        energyCost: 25, weeklyCost: 0, income: 0, upfrontCost: 1200, 
        totalDuration: 8, weeksCompleted: 0,
        skillGains: { improvisation: 0.5, charisma: 0.2 },
        payoutType: 'WEEKLY'
    },
    // ADVANCED
    { 
        id: 'ws_media_training', name: 'Media Training', type: 'COURSE', 
        energyCost: 15, weeklyCost: 0, income: 0, upfrontCost: 2500, 
        totalDuration: 4, weeksCompleted: 0,
        skillGains: { charisma: 0.6, presence: 0.2 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_advanced_lab', name: 'Advanced Lab', type: 'COURSE', 
        energyCost: 30, weeklyCost: 0, income: 0, upfrontCost: 4500, 
        totalDuration: 10, weeksCompleted: 0,
        skillGains: { expression: 0.4, improvisation: 0.3, presence: 0.2 },
        payoutType: 'WEEKLY'
    },
    // MASTER
    { 
        id: 'ws_masterclass', name: 'Legend Masterclass', type: 'COURSE', 
        energyCost: 20, weeklyCost: 0, income: 0, upfrontCost: 10000, 
        totalDuration: 6, weeksCompleted: 0,
        skillGains: { presence: 0.8, discipline: 0.4 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_method_intensive', name: 'The Method', type: 'COURSE', 
        energyCost: 40, weeklyCost: 0, income: 0, upfrontCost: 8000, 
        totalDuration: 12, weeksCompleted: 0,
        skillGains: { expression: 0.8, delivery: 0.3 },
        payoutType: 'WEEKLY'
    },
    // WRITER WORKSHOPS (NEW)
    { 
        id: 'ws_creative_writing', name: 'Creative Writing Seminar', type: 'COURSE', 
        energyCost: 20, weeklyCost: 0, income: 0, upfrontCost: 2000, 
        totalDuration: 6, weeksCompleted: 0,
        writerGains: { creativity: 0.5 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_dialogue_masterclass', name: 'Dialogue Masterclass', type: 'COURSE', 
        energyCost: 25, weeklyCost: 0, income: 0, upfrontCost: 3500, 
        totalDuration: 8, weeksCompleted: 0,
        writerGains: { dialogue: 0.6 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_story_structure', name: 'Story Structure Workshop', type: 'COURSE', 
        energyCost: 30, weeklyCost: 0, income: 0, upfrontCost: 5000, 
        totalDuration: 10, weeksCompleted: 0,
        writerGains: { structure: 0.7 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_pacing_workshop', name: 'Pacing & Rhythm Workshop', type: 'COURSE', 
        energyCost: 25, weeklyCost: 0, income: 0, upfrontCost: 4000, 
        totalDuration: 8, weeksCompleted: 0,
        writerGains: { pacing: 0.6 },
        payoutType: 'WEEKLY'
    },
    // DIRECTOR WORKSHOPS (NEW)
    { 
        id: 'ws_directing_basics', name: 'Directing Basics', type: 'COURSE', 
        energyCost: 20, weeklyCost: 0, income: 0, upfrontCost: 1500, 
        totalDuration: 4, weeksCompleted: 0,
        directorGains: { vision: 0.4, technical: 0.2 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_cinematography_lab', name: 'Visual Storytelling', type: 'COURSE', 
        energyCost: 25, weeklyCost: 0, income: 0, upfrontCost: 3000, 
        totalDuration: 6, weeksCompleted: 0,
        directorGains: { style: 0.5, technical: 0.3 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_leadership_set', name: 'Set Leadership', type: 'COURSE', 
        energyCost: 30, weeklyCost: 0, income: 0, upfrontCost: 5000, 
        totalDuration: 8, weeksCompleted: 0,
        directorGains: { leadership: 0.6, vision: 0.2 },
        payoutType: 'WEEKLY'
    },
    { 
        id: 'ws_auteur_masterclass', name: 'Auteur Masterclass', type: 'COURSE', 
        energyCost: 35, weeklyCost: 0, income: 0, upfrontCost: 12000, 
        totalDuration: 12, weeksCompleted: 0,
        directorGains: { vision: 0.8, style: 0.6, leadership: 0.4 },
        payoutType: 'WEEKLY'
    }
];

export const GENRE_TRAINING_CATALOG: { genre: Genre, label: string, desc: string, cost: number, energy: number, gain: number }[] = [
    { genre: 'ACTION', label: 'Stunt Choreography', desc: 'Learn combat and falls.', cost: 25, energy: 10, gain: 1 },
    { genre: 'DRAMA', label: 'Method Acting Lab', desc: 'Emotional depth practice.', cost: 25, energy: 10, gain: 1 },
    { genre: 'COMEDY', label: 'Improv Club', desc: 'Timing and wit.', cost: 25, energy: 10, gain: 1 },
    { genre: 'ROMANCE', label: 'Screen Chemistry', desc: 'Intimacy coordination.', cost: 25, energy: 10, gain: 1 },
    { genre: 'THRILLER', label: 'Tension Workshop', desc: 'Pacing and suspense.', cost: 25, energy: 10, gain: 1 },
    { genre: 'HORROR', label: 'Scream Queen 101', desc: 'Fear reactions.', cost: 25, energy: 10, gain: 1 },
    { genre: 'SCI_FI', label: 'Green Screen Tech', desc: 'Acting with nothing.', cost: 25, energy: 10, gain: 1 },
    { genre: 'ADVENTURE', label: 'Parkour & Movement', desc: 'Running and jumping.', cost: 25, energy: 10, gain: 1 },
    { genre: 'SUPERHERO', label: 'Wire Work', desc: 'Flying on cables.', cost: 25, energy: 10, gain: 1 },
];

export type ImproveCategory = 'BODY' | 'HEALTH' | 'LOOKS' | 'MOOD';

export const IMPROVEMENT_CATALOG: Record<ImproveCategory, ImprovementActivity[]> = {
    BODY: [
        {
            id: 'act_gym_local',
            name: 'Local Gym',
            description: 'Basic equipment, no frills.',
            options: [
                { id: 'opt_cardio', label: 'Cardio Session', energyCost: 15, moneyCost: 15, gains: { body: 0.5, health: 0.2 }, risk: 5, description: 'Treadmill and bikes.' },
                { id: 'opt_weights', label: 'Weight Training', energyCost: 25, moneyCost: 15, gains: { body: 0.8 }, risk: 10, description: 'Free weights and machines.' },
            ]
        },
        {
            id: 'act_gym_crossfit',
            name: 'CrossFit Box',
            description: 'High intensity, high community.',
            options: [
                { id: 'opt_wod', label: 'WOD (Workout of Day)', energyCost: 35, moneyCost: 30, gains: { body: 1.2, health: 0.3 }, risk: 20, description: 'Grueling circuit training.' },
            ]
        },
        {
            id: 'act_outdoor',
            name: 'Outdoors',
            description: 'Fresh air and movement.',
            options: [
                { id: 'opt_jog', label: 'Morning Jog', energyCost: 10, moneyCost: 0, gains: { body: 0.3, health: 0.1, happiness: 0.2 }, risk: 2, description: 'A run around the block.' },
                { id: 'opt_hike', label: 'Runyon Canyon Hike', energyCost: 20, moneyCost: 5, gains: { body: 0.6, happiness: 0.5 }, risk: 5, description: 'See and be seen.' },
            ]
        }
    ],
    HEALTH: [
        {
            id: 'act_medical',
            name: 'Medical Center',
            description: 'Professional healthcare.',
            options: [
                { id: 'opt_checkup', label: 'General Checkup', energyCost: 10, moneyCost: 150, gains: { health: 2.0 }, risk: 0, description: 'Routine physical.' },
                { id: 'opt_physio', label: 'Physiotherapy', energyCost: 15, moneyCost: 200, gains: { health: 1.5, body: 0.2 }, risk: 0, description: 'Treat aches and pains.' },
            ]
        },
        {
            id: 'act_recovery',
            name: 'Recovery Spa',
            description: 'Rest and recuperation.',
            options: [
                { id: 'opt_massage', label: 'Deep Tissue Massage', energyCost: 5, moneyCost: 120, gains: { health: 0.8, happiness: 0.5 }, risk: 0, description: 'Relieve muscle tension.' },
                { id: 'opt_icebath', label: 'Ice Bath', energyCost: 15, moneyCost: 40, gains: { health: 1.0, discipline: 0.2 }, risk: 5, description: 'Brutal but effective.' },
            ]
        }
    ],
    LOOKS: [
        {
            id: 'act_salon',
            name: 'Salon & Grooming',
            description: 'Hair, skin, and nails.',
            options: [
                { id: 'opt_haircut', label: 'Fresh Haircut', energyCost: 10, moneyCost: 80, gains: { looks: 1.0, happiness: 0.5 }, risk: 5, description: 'New style.' },
                { id: 'opt_facial', label: 'Facial Treatment', energyCost: 5, moneyCost: 150, gains: { looks: 1.5 }, risk: 0, description: 'Deep cleansing.' },
            ]
        },
        {
            id: 'act_stylist',
            name: 'Image Consulting',
            description: 'Professional styling.',
            options: [
                { id: 'opt_wardrobe', label: 'Wardrobe Consult', energyCost: 20, moneyCost: 300, gains: { looks: 0.5, reputation: 0.5 }, risk: 10, description: 'Update your style.' },
            ]
        }
    ],
    MOOD: [
        {
            id: 'act_leisure',
            name: 'Leisure Time',
            description: 'Relax and unwind.',
            options: [
                { id: 'opt_meditate', label: 'Meditation', energyCost: 5, moneyCost: 0, gains: { happiness: 1.0, discipline: 0.1 }, risk: 0, description: 'Find your center.' },
                { id: 'opt_gaming', label: 'Video Games', energyCost: 10, moneyCost: 0, gains: { happiness: 1.5 }, risk: 5, description: 'Escape reality.' },
                { id: 'opt_nightout', label: 'Night Out', energyCost: 30, moneyCost: 200, gains: { happiness: 3.0, reputation: 0.2 }, risk: 25, description: 'Party in the city.' },
            ]
        },
        {
            id: 'act_therapy',
            name: 'Therapy',
            description: 'Mental health maintenance.',
            options: [
                { id: 'opt_counseling', label: 'Counseling Session', energyCost: 10, moneyCost: 150, gains: { happiness: 2.0, health: 0.5 }, risk: 0, description: 'Talk it out.' },
            ]
        }
    ]
};

export interface BusinessStartupOption {
    type: BusinessType;
    name: string;
    description: string;
    startupCost: number;
    weeklyExpense: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    energyDrain: number;
}

export const BUSINESS_CATALOG: BusinessStartupOption[] = [
    {
        type: 'CAFE',
        name: 'Local Café',
        description: 'A cozy spot for coffee lovers. Low risk, slow growth.',
        startupCost: 20000,
        weeklyExpense: 500,
        riskLevel: 'Low',
        energyDrain: 15,
    },
    {
        type: 'MERCH',
        name: 'Online Brand',
        description: 'Sell merch to your followers. Scalable but volatile.',
        startupCost: 5000,
        weeklyExpense: 100,
        riskLevel: 'Medium',
        energyDrain: 10,
    },
    {
        type: 'MERCH',
        name: 'Indie Production House',
        description: 'Create your own content. High risk, high reward. (Fame > 30 Locked)',
        startupCost: 100000,
        weeklyExpense: 2000,
        riskLevel: 'High',
        energyDrain: 25,
    }
];
