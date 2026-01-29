const mongoose = require('mongoose');
const Measurement = require('./app'); 

mongoose.connect('mongodb://localhost:27017/as4');

async function seed() {
    await Measurement.deleteMany({}); 
    
    const data = [];
    for (let i = 0; i < 30; i++) {
        let date = new Date();
        date.setDate(date.getDate() - i);

        data.push({
            timestamp: date,
            field1: Math.floor(Math.random() * 30), 
            field2: Math.floor(Math.random() * 100), 
            field3: Math.floor(Math.random() * 500)});
    }
    
    await Measurement.insertMany(data);
    console.log("Database seeded");
    process.exit();
}

seed();