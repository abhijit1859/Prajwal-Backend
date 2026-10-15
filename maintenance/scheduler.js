const cron = require("node-cron");
const { 
    syncCoursesWithQuestions, 
    clearUploadsDirectory, 
    syncUserBookmarkedQuestions, 
    clearNonExistingUserPreferences ,
    syncPaidCoursesWithUsers
} = require("../controllers/sync"); // Import the sync function

const scheduleSyncJob = () => {
    // Schedule the job to run every Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
        console.log('Running the scheduled job to sync courses with questions...');
        try {
            await syncCoursesWithQuestions(); // Call the sync function directly
            console.log('Courses synced successfully');
        } catch (error) {
            console.error('Error syncing courses:', error);
        }
    });

    // Schedule the job to run every Sunday at 3:10 AM
    cron.schedule('10 3 * * 0', async () => {
        console.log('Running the scheduled job to clear uploads directory...');
        try {
            await clearUploadsDirectory(); // Call the sync function directly
            console.log('Uploads directory cleared successfully');
        } catch (error) {
            console.error('Error clearing uploads directory:', error);
        }
    });

    // Schedule the job to run every Sunday at 3:20 AM
    cron.schedule('20 3 * * 0', async () => {
        console.log('Running the scheduled job to sync user bookmarked questions...');
        try {
            await syncUserBookmarkedQuestions(); // Call the sync function directly
            console.log('User bookmarked questions synced successfully');
        } catch (error) {
            console.error('Error syncing user bookmarked questions:', error);
        }
    });

    // Schedule the job to run every Sunday at 3:30 AM
    cron.schedule('30 3 * * 0', async () => {
        console.log('Running the scheduled job to clear non-existing user preferences...');
        try {
            await clearNonExistingUserPreferences(); // Call the sync function directly
            console.log('Non-existing user preferences cleared successfully');
        } catch (error) {
            console.error('Error clearing non-existing user preferences:', error);
        }
    });

    // Schedule the job to run every Sunday at 3:40 AM
    cron.schedule('40 3 * * 0', async () => {
        console.log('Running the scheduled job to clear non-existing user preferences...');
        try {
            await syncPaidCoursesWithUsers(); // Call the sync function directly
            console.log('Non-existing user preferences cleared successfully');
        } catch (error) {
            console.error('Error clearing non-existing user preferences:', error);
        }
    });
};

module.exports = {
    scheduleSyncJob
};
