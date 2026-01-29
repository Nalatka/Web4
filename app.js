const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');



app.use(express.json());

app.use(cors());
app.use(express.static(__dirname));

mongoose.connect('mongodb+srv://peacediebull1_db_user:<db_password>@cluster0.0fic2sp.mongodb.net/?appName=Cluster0',{serverSelectionTimeoutMS: 5000})
.then(() => {
    console.log('Connected to MongoDB')
    quickSeed()
})
.catch(err => {
    console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ К БД:', err.message);
    console.log('Убедитесь, что MongoDB запущена! Попробуйте запустить Compass.');
});



const measurementSchema = new mongoose.Schema({
    timestamp: { type: Date, index: true },
    field1: Number,
    field2: Number,
    field3: Number
});

const Measurement = mongoose.model('Measurement', measurementSchema);

const allowedFields = ['field1', 'field2', 'field3'];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/measurements', async (req, res) => {
    try {
        const { field, start_date, end_date } = req.query;
        
        if (!field || !allowedFields.includes(field)) {
            return res.status(400).json({ error: 'field must be one of: field1, field2, field3' });
        }

        const query = {};
        if (start_date || end_date) {
            query.timestamp = {};
            if (start_date) query.timestamp.$gte = new Date(start_date);
            if (end_date) {
                const end = new Date(end_date);
                end.setHours(23, 59, 59, 999);
                query.timestamp.$lte = end;
            }
        }
        query[field] = { $ne: null };

        const data = await Measurement.find(query)
            .select(`timestamp ${field} -_id`)
            .sort({ timestamp: 1 });

        if (data.length === 0) {
            return res.status(404).json({ error: 'No data found for this field and date range' });
        }

        res.json(data);
    } catch (err) {
        res.status(400).json({ error: "Invalid parameters or date format" });
    }
});

app.get('/api/measurements/metrics', async (req, res) => {
    try {
        const { field, start_date, end_date } = req.query;

        if (!field || !allowedFields.includes(field)) {
            return res.status(400).json({ error: 'field must be one of: field1, field2, field3' });
        }

        const match = {};
        if (start_date || end_date) {
            match.timestamp = {};
            if (start_date) match.timestamp.$gte = new Date(start_date);
            if (end_date) {
                const end = new Date(end_date);
                end.setHours(23, 59, 59, 999);
                match.timestamp.$lte = end;
            }
        }
        match[field] = { $ne: null };

        const metrics = await Measurement.aggregate([
            { 
                $match: match
            },
            {
                $group: {
                    _id: null,
                    avg: { $avg: `$${field}` },
                    min: { $min: `$${field}` },
                    max: { $max: `$${field}` },
                    stdDev: { $stdDevPop: `$${field}` }
                }
            }
        ]);

        if (metrics.length === 0 || metrics[0].avg === null) {
            return res.status(404).json({ message: "No data found" });
        }
        res.json(metrics[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/measurements', async (req, res) => {
    try {
        const measurement = new Measurement(req.body);
        await measurement.save();
        res.status(201).send(measurement);
    } catch (err) {
        res.status(400).send(err);
    }
});

async function quickSeed() {
    try {
        const count = await Measurement.countDocuments();
        if (count === 0) {
            console.log("Empty database. Seeding data for Jan 2026...");
            const data = [];
            for (let i = 1; i <= 25; i++) {
                data.push({
                    timestamp: new Date(`2026-01-${i < 10 ? '0'+i : i}T12:00:00Z`),
                    field1: Math.floor(Math.random() * 30 + 10),
                    field2: Math.floor(Math.random() * 50 + 20),
                    field3: Math.floor(Math.random() * 400 + 100)
                });
            }
            await Measurement.insertMany(data);
            console.log("✅ Database seeded with 25 records for Jan 2026.");
        } else {
            console.log(`ℹ️ Database already has ${count} records.`);
        }
    } catch (err) {
        console.error("❌ Seed error:", err);
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

module.exports = { Measurement, app };