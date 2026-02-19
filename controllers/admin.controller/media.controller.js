import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Media from '../../models/Media.model.js';
import Step from '../../models/Step.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');
const uploadsDir = path.join(projectRoot, 'uploads');

/**
 * Resolve stored filePath/thumbnail to a local filesystem path and delete the file if it exists.
 * Used for all media types: video, audio, image, animation.
 * Handles: absolute paths, relative paths (/uploads/... or uploads/...), and skips full URLs.
 */
function deleteFileIfExists(storedPath) {
  if (!storedPath || typeof storedPath !== 'string' || !storedPath.trim()) return;
  const trimmed = storedPath.trim();
  // Skip full URLs (cannot delete remote files)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return;
  let localPath;
  if (path.isAbsolute(trimmed)) {
    localPath = trimmed;
  } else {
    // Relative: e.g. /uploads/assets/videos/foo.mp4 or uploads/assets/videos/foo.mp4
    const relative = trimmed.replace(/^\/+/, '');
    localPath = path.join(projectRoot, relative);
  }
  // Safety: only delete files under project's uploads directory
  const resolved = path.resolve(localPath);
  const uploadsResolved = path.resolve(uploadsDir);
  const relative = path.relative(uploadsResolved, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return;
  try {
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      fs.unlinkSync(resolved);
    }
  } catch (err) {
    console.warn('Could not delete media file:', resolved, err.message);
  }
}

// Get all media (Video Library)
export const getAllMedia = async (req, res) => {
  try {
    const { mediaType, tags, isActive, search } = req.query;
    let query = {};

    if (mediaType) query.mediaType = mediaType;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const media = await Media.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { media }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching media',
      error: error.message
    });
  }
};

// Get media by ID
export const getMediaById = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Get usage count (how many steps use this media)
    const usageCount = await Step.countDocuments({ media: media._id });

    res.json({
      success: true,
      data: { media, usageCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching media',
      error: error.message
    });
  }
};

// Create media
export const createMedia = async (req, res) => {
  try {
    const {
      title,
      description,
      mediaType,
      filePath,
      thumbnail,
      duration,
      orientation,
      instructor,
      tags,
      isActive
    } = req.body;

    // Parse tags if it's a string (from formData)
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          // If not JSON, treat as comma-separated string
          parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    const media = await Media.create({
      title,
      description,
      mediaType,
      filePath: filePath || (req.file ? req.file.path : null),
      thumbnail: thumbnail || (req.files?.thumbnail?.[0]?.path || null),
      duration: parseInt(duration) || 0,
      orientation: orientation || 'portrait',
      instructor: instructor || {},
      tags: parsedTags,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Media created successfully',
      data: { media }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating media',
      error: error.message
    });
  }
};

// Update media
export const updateMedia = async (req, res) => {
  try {
    const {
      title,
      description,
      filePath,
      thumbnail,
      duration,
      orientation,
      instructor,
      tags,
      isActive
    } = req.body;

    const updateData = {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(filePath && { filePath }),
      ...(thumbnail !== undefined && { thumbnail }),
      ...(duration !== undefined && { duration }),
      ...(orientation && { orientation }),
      ...(instructor && { instructor }),
      ...(tags !== undefined && { tags }),
      ...(isActive !== undefined && { isActive })
    };

    // Handle file uploads if present
    if (req.file) {
      updateData.filePath = req.file.path;
    }
    if (req.files?.thumbnail?.[0]) {
      updateData.thumbnail = req.files.thumbnail[0].path;
    }

    const media = await Media.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    res.json({
      success: true,
      message: 'Media updated successfully',
      data: { media }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating media',
      error: error.message
    });
  }
};

// Delete media
export const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Check if media is being used
    const usageCount = await Step.countDocuments({ media: media._id });
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete media. It is being used in ${usageCount} step(s). Please remove it from all steps first.`
      });
    }

    // Delete main file (video/audio/image/animation) and thumbnail from disk for all media types
    deleteFileIfExists(media.filePath);
    deleteFileIfExists(media.thumbnail);

    await Media.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting media',
      error: error.message
    });
  }
};
