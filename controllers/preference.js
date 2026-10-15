const Preference = require('../models/preference');

// Define allowed fields
const allowedFields = ['board', 'medium', 'standard', 'theme', 'notifications', 'language'];

const filterBody = (body) => {
  const filteredBody = {};
  Object.keys(body).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredBody[key] = body[key];
    }
  });
  return filteredBody;
};

//! Create new preferences for a user
exports.createPreferences = async (req, res) => {
  try {
    const newPreferenceData = {
      ...filterBody(req.body),
      user: req.user._id,
    };

    const newPreference = await Preference.create(newPreferenceData);
    res.status(201).json({
      success: true,
      preference: newPreference,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//! Get preferences for a user
exports.getPreferences = async (req, res) => {
  try {
    const preferences = await Preference.findOne({ user: req.user._id });

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Preferences not found',
      });
    }

    res.status(200).json({
      success: true,
      preference: preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//! Update preferences for a user
exports.updatePreferences = async (req, res) => {
  try {
    const filteredBody = filterBody(req.body);
    const preferences = await Preference.findOneAndUpdate(
      { user: req.user._id },
      { $set: { preferences: filteredBody } },
      { new: true }
    );

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Preferences not found',
      });
    }

    res.status(200).json({
      success: true,
      preference: preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
