// Curated list of well-known Indian blood banks. A real deployment would pull
// these from a database / live registry; for now we seed a static directory
// searchable by city so the page has real, useful data.
const BLOOD_BANKS = [
  { name: "Indian Red Cross Society Blood Bank", city: "Hyderabad", address: "Red Cross Bhawan, Nampally", phone: "040-23202418", hours: "8:00 AM - 7:00 PM" },
  { name: "Apollo Blood Bank", city: "Hyderabad", address: "Apollo Hospitals, Jubilee Hills", phone: "040-23607777", hours: "24 Hours" },
  { name: "Nizam's Institute of Medical Sciences", city: "Hyderabad", address: "Punjagutta", phone: "040-23489200", hours: "24 Hours" },
  { name: "Care Hospitals Blood Bank", city: "Hyderabad", address: "Banjara Hills", phone: "040-30418400", hours: "24 Hours" },
  { name: "Rotary Blood Bank", city: "Bengaluru", address: "Jayanagar 4th Block", phone: "080-26641351", hours: "8:00 AM - 8:00 PM" },
  { name: "St. John's Blood Bank", city: "Bengaluru", address: "St. John's Medical College, Koramangala", phone: "080-25531115", hours: "8:00 AM - 8:00 PM" },
  { name: "Kempegowda Institute of Medical Sciences Blood Bank", city: "Bengaluru", address: "K.R. Road", phone: "080-26711672", hours: "8:00 AM - 8:00 PM" },
  { name: "Sankara Nethralaya Blood Bank", city: "Chennai", address: "18 College Road, Nungambakkam", phone: "044-28271616", hours: "8:00 AM - 6:00 PM" },
  { name: "Vijaya Blood Bank", city: "Chennai", address: "Nungambakkam", phone: "044-28330685", hours: "8:00 AM - 9:00 PM" },
  { name: "Stanley Medical College Blood Bank", city: "Chennai", address: "Royapuram", phone: "044-25281345", hours: "24 Hours" },
  { name: "KEM Hospital Blood Bank", city: "Mumbai", address: "Parel", phone: "022-24136212", hours: "8:00 AM - 8:00 PM" },
  { name: "Seth Gordhandas Sunderdas Medical College", city: "Mumbai", address: "Grant Medical College, Byculla", phone: "022-23735555", hours: "24 Hours" },
  { name: "Tata Memorial Hospital Blood Bank", city: "Mumbai", address: "Parel", phone: "022-24177000", hours: "24 Hours" },
  { name: "AIIMS Blood Bank", city: "New Delhi", address: "AIIMS, Ansari Nagar", phone: "011-26589328", hours: "24 Hours" },
  { name: "Lok Nayak Hospital Blood Bank", city: "New Delhi", address: "Jawaharlal Nehru Marg", phone: "011-23232564", hours: "24 Hours" },
  { name: "Rajiv Gandhi Govt. General Hospital Blood Bank", city: "Chennai", address: "Park Town", phone: "044-25305200", hours: "24 Hours" },
  { name: "Civil Hospital Blood Bank", city: "Ahmedabad", address: "Asarwa", phone: "079-22684543", hours: "24 Hours" },
  { name: "Post Graduate Institute Blood Bank", city: "Chandigarh", address: "PGIMER, Sector 12", phone: "0172-2747585", hours: "24 Hours" },
  { name: "Sanjay Gandhi Postgraduate Institute", city: "Lucknow", address: "Raebareli Road", phone: "0522-2495254", hours: "24 Hours" },
  { name: "Vijaya Blood Bank", city: "Visakhapatnam", address: "Daba Gardens", phone: "0891-2568016", hours: "8:00 AM - 8:00 PM" },
]

const cities = [...new Set(BLOOD_BANKS.map((b) => b.city))].sort()

// GET /api/bloodbanks?city=... - list blood banks, optionally filtered by city
const listBloodBanks = (req, res) => {
  const city = (req.query.city || "").trim().toLowerCase()
  const filtered = city
    ? BLOOD_BANKS.filter((b) => b.city.toLowerCase().includes(city))
    : BLOOD_BANKS
  res.json({ bloodBanks: filtered, cities })
}

module.exports = { listBloodBanks }