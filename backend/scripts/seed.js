import "dotenv/config";
import mongoose from "mongoose";
import { format, subDays } from "date-fns";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Habit from "../models/Habits.js";
import HabitLog from "../models/HabitLog.js";
import AIInsight from "../models/AllInsight.js";

const EMAIL = "aish@sad.com";
const PASSWORD = "123456";
const NAME = "aish";

const HABITS = [{
        name: "Morning Workout",
        description: "Exercise for 30 minutes after waking up.",
        category: "Fitness",
        frequency: "Daily",
        targetDays: 7,
        color: "#FF5733",
        icon: "🏋️",
        _streakProb: 0.85
    },
    {
        name: "Drink Water",
        description: "Drink enough water throughout the day.",
        category: "Health",
        frequency: "Daily",
        targetDays: 7,
        color: "#3498DB",
        icon: "💧",
        _streakProb: 0.92
    },
    {
        name: "Read Books",
        description: "Read at least 20 pages every day.",
        category: "Learning",
        frequency: "Daily",
        targetDays: 7,
        color: "#9B59B6",
        icon: "📚",
        _streakProb: 0.78
    },
    {
        name: "Meditation",
        description: "Practice mindfulness for mental peace.",
        category: "Mindfulness",
        frequency: "Daily",
        targetDays: 7,
        color: "#8E44AD",
        icon: "🧘",
        _streakProb: 0.80
    },
    {
        name: "Sleep Early",
        description: "Sleep before 11 PM every night.",
        category: "Health",
        frequency: "Daily",
        targetDays: 7,
        color: "#34495E",
        icon: "😴",
        _streakProb: 0.70
    },
    {
        name: "Morning Walk",
        description: "Walk outside for fresh air and fitness.",
        category: "Fitness",
        frequency: "Daily",
        targetDays: 7,
        color: "#27AE60",
        icon: "🚶",
        _streakProb: 0.82
    },
    {
        name: "Learn Coding",
        description: "Practice programming concepts daily.",
        category: "Learning",
        frequency: "Daily",
        targetDays: 7,
        color: "#2ECC71",
        icon: "💻",
        _streakProb: 0.76
    },
    {
        name: "Practice English",
        description: "Improve English speaking skills.",
        category: "Learning",
        frequency: "Weekly",
        targetDays: 5,
        color: "#2980B9",
        icon: "🗣️",
        _streakProb: 0.65
    },
    {
        name: "Journal Writing",
        description: "Write thoughts and daily reflections.",
        category: "Mindfulness",
        frequency: "Daily",
        targetDays: 7,
        color: "#F39C12",
        icon: "✍️",
        _streakProb: 0.68
    },
    {
        name: "Save Money",
        description: "Save money and track expenses.",
        category: "Finance",
        frequency: "Daily",
        targetDays: 7,
        color: "#16A085",
        icon: "💰",
        _streakProb: 0.74
    },
];

const todayKey = () => format(new Date(), "yyyy-MM-dd");

const buildLogs = (habit, totalDays = 90) => {
    const logs = [];
    const today = new Date();

    for (let i = 0; i < totalDays; i++) {
        const d = subDays(today, i);
        const key = format(d, "yyyy-MM-dd");

        let p = habit._streakProb || 0.5;

        if (habit._pattern === "weekdays") {
            const day = d.getDay();
            if (day === 0 || day === 6) {
                p *= 0.35;
            }
        }

        if (habit._pattern === "dropoff") {
            if (i < 14) {
                p *= 0.25;
            }
        }

        if (
            habit._brokeAt &&
            i >= habit._brokeAt - 2 &&
            i <= habit._brokeAt + 2
        ) {
            continue;
        }

        const seed =
            Math.sin(i * 9301 + habit.name.length * 49297) * 233280;

        const random = seed - Math.floor(seed);

        if (random < p) {
            logs.push({
                completedDate: key
            });
        }
    }

    return logs;
};


const run = async() => {
    await connectDB();

    let user = await User.findOne({
        email: EMAIL
    });

    if (user) {
        console.log(`Found existing user ${EMAIL} — clearing data...`);

        await Habit.deleteMany({
            userId: user._id
        });

        await HabitLog.deleteMany({
            userId: user._id
        });

        await AIInsight.deleteMany({
            userId: user._id
        });

        user.name = NAME;
        user.avatar = NAME.charAt(0).toUpperCase();
        user.morningMotivation = true;
        user.password = PASSWORD;

        await user.save();

    } else {

        user = await User.create({
            name: NAME,
            email: EMAIL,
            password: PASSWORD,
            avatar: NAME.charAt(0).toUpperCase(),
            morningMotivation: true
        });

        console.log(`Created user ${EMAIL}`);
    }


    const createdHabits = [];

    for (let i = 0; i < HABITS.length; i++) {

        const h = HABITS[i];

        const habit = await Habit.create({

            userId: user._id,

            name: h.name,

            description: h.description,

            category: h.category,

            frequency: h.frequency,

            targetDays: h.targetDays,

            color: h.color,

            icon: h.icon,

            order: i,

            createdAt: subDays(new Date(), 89),

            updatedAt: subDays(new Date(), 89)

        });


        habit.createdAt = subDays(new Date(), 89);

        await habit.save({
            timestamps: false
        });


        createdHabits.push({
            habit,
            config: h
        });
    }

    let totalLogs = 0;

    for (const { habit, config }
        of createdHabits) {

        const logs = buildLogs(config);

        if (!logs.length) continue;


        const docs = logs.map((l) => ({
            userId: user._id,
            habitId: habit._id,
            completedDate: l.completedDate
        }));


        await HabitLog.insertMany(docs, {
            ordered: false
        }).catch(() => {});


        totalLogs += docs.length;
    }


    // Add today's completed habits
    const today = todayKey();

    const todayDoneHabits = createdHabits
        .slice(0, 4)
        .map((c) => c.habit);


    for (const h of todayDoneHabits) {

        await HabitLog.updateOne(

            {
                userId: user._id,
                habitId: h._id,
                completedDate: today
            },

            {
                $setOnInsert: {
                    userId: user._id,
                    habitId: h._id,
                    completedDate: today
                }
            },

            {
                upsert: true
            }
        );
    }


    console.log("\n✅ Seed complete");
    console.log(`User: ${EMAIL}`);
    console.log(`Password: ${PASSWORD}`);
    console.log(`Habits: ${createdHabits.length}`);
    console.log(`Logs: ~${totalLogs}`);


    await mongoose.disconnect();
};


run().catch(async(err) => {

    console.error("Seed failed:", err);

    await mongoose.disconnect();

    process.exit(1);

});