import Video from '../../models/Video.model.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const {
      title,
      description,
      type,
      category,
      phase,
      duration,
      equipment,
      benefits,
      isPremium,
      sequence
    } = req.body;

    // Calculate duration in minutes
    const durationMinutes = Math.round((parseInt(duration) || 0) / 60);

    const video = new Video({
      title,
      description,
      type,
      category: category || 'general',
      phase: phase || 'all',
      filePath: `/uploads/videos/${req.file.filename}`,
      duration: parseInt(duration) || 0,
      durationMinutes,
      equipment: equipment || 'Equipment-free',
      benefits: benefits ? JSON.parse(benefits) : [],
      isPremium: isPremium === 'true',
      isActive: true,
      sequence: sequence ? JSON.parse(sequence) : null,
      createdBy: req.user._id
    });

    await video.save();

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        video
      }
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading video',
      error: error.message
    });
  }
};

export default uploadVideo;
