import GhostPost from "../models/GhostPost.js";

export const mockGhostPosts = [
    {
        id: "ghost_1",
        content: "Sometimes the hardest goodbye is the one you never got to say.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
        fadeLevel: 0.1,
    },
    {
        id: "ghost_2",
        content: "I still think about that moment every single day. It changed everything.",
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
        fadeLevel: 0.25,
    },
    {
        id: "ghost_3",
        content: "The universe has a funny way of bringing people together exactly when you need them.",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        fadeLevel: 0.5,
    },
    {
        id: "ghost_4",
        content: "I forgave you today. Not for you, but for myself.",
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        fadeLevel: 0.75,
    },
    {
        id: "ghost_5",
        content: "Some memories are too precious to share but too heavy to carry alone.",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
        fadeLevel: 0.05,
    },
];

// Function to seed the database with mock data
export const seedGhostPosts = async () => {
    try {
        // Clear existing data
        await GhostPost.deleteMany({});

        // Insert mock data
        const seededPosts = await GhostPost.insertMany(
            mockGhostPosts.map((post) => ({
                ...post,
                isExpired: false,
            }))
        );

        console.log(`✓ Seeded ${seededPosts.length} ghost posts`);
        return seededPosts;
    } catch (error) {
        console.error("Error seeding ghost posts:", error.message);
        throw error;
    }
};

// Function to clear all ghost posts
export const clearGhostPosts = async () => {
    try {
        const result = await GhostPost.deleteMany({});
        console.log(`✓ Deleted ${result.deletedCount} ghost posts`);
        return result;
    } catch (error) {
        console.error("Error clearing ghost posts:", error.message);
        throw error;
    }
};
