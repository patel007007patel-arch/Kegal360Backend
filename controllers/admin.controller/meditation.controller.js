import Meditation from '../../models/Meditation.model.js';
import Media from '../../models/Media.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getServerUrl } from '../../utils/serverUrl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');
const uploadsDir = path.join(projectRoot, 'uploads');

const MEDIA_AUDIO_PATH = '/uploads/assets/audio/';
const MEDIA_THUMBNAIL_PATH = '/uploads/assets/thumbnails/';

/** Build full URL for media file (audio or thumbnail). */
function getMediaFileUrl(multerFile, type) {
    if (!multerFile?.filename) return null;
    const base = getServerUrl();
    const pathPrefix = type === 'thumbnail' ? MEDIA_THUMBNAIL_PATH : MEDIA_AUDIO_PATH;
    return `${base}${pathPrefix}${multerFile.filename}`;
}

/**
 * Resolve stored filePath/thumbnail to a local filesystem path and delete the file if it exists.
 * Handles: full URLs (same as stored for images), absolute paths, relative paths.
 */
function deleteFileIfExists(storedPath) {
    if (!storedPath || typeof storedPath !== 'string' || !storedPath.trim()) return;
    const trimmed = storedPath.trim();
    let localPath;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const u = new URL(trimmed);
            const pathname = u.pathname.replace(/^\/+/, '');
            localPath = path.join(projectRoot, pathname);
        } catch {
            return;
        }
    } else if (path.isAbsolute(trimmed)) {
        localPath = trimmed;
    } else {
        const relative = trimmed.replace(/^\/+/, '');
        localPath = path.join(projectRoot, relative);
    }
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

// Get all meditations
export const getAllMeditations = async (req, res) => {
    try {
        const filters = {};
        if (req.query.status) {
            filters.isActive = req.query.status === 'active';
        }

        const { page = 1, limit = 10, search } = req.query;
        if (search) {
            filters.$or = [
                { title: { $regex: search, $options: 'i' } },
                { subtitle: { $regex: search, $options: 'i' } }
            ];
        }

        const meditations = await Meditation.find(filters)
            .populate('media')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Meditation.countDocuments(filters);

        res.status(200).json({
            success: true,
            data: meditations,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meditations',
            error: error.message
        });
    }
};

// Get single meditation
export const getMeditationById = async (req, res) => {
    try {
        const meditation = await Meditation.findById(req.params.id).populate('media');
        if (!meditation) {
            return res.status(404).json({ success: false, message: 'Meditation not found' });
        }
        res.status(200).json({ success: true, data: meditation });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meditation',
            error: error.message
        });
    }
};

// Create new meditation
export const createMeditation = async (req, res) => {
    try {
        const { title, subtitle, description, duration, benefits, mediaId } = req.body;

        let thumbnailPath = '';

        if (mediaId) {
            const media = await Media.findById(mediaId);
            if (!media) {
                return res.status(400).json({ success: false, message: 'Invalid media selected' });
            }
            // Use explicitly uploaded thumbnail if present, otherwise fallback to media thumbnail
            if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
                thumbnailPath = getMediaFileUrl(req.files.thumbnail[0], 'thumbnail');
            } else {
                thumbnailPath = media.thumbnail || '';
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Media ID is required'
            });
        }

        // Process benefits array if it's sent as JSON string
        let parsedBenefits = [];
        if (benefits) {
            try {
                parsedBenefits = typeof benefits === 'string' ? JSON.parse(benefits) : benefits;
            } catch (e) {
                parsedBenefits = [benefits]; // Fallback if regular string
            }
        }

        const meditation = await Meditation.create({
            title,
            subtitle,
            description,
            duration: duration || 0,
            benefits: parsedBenefits,
            media: mediaId,
            thumbnail: thumbnailPath || undefined,
            isActive: req.body.isActive === 'false' ? false : true
        });

        await meditation.populate('media');

        res.status(201).json({
            success: true,
            message: 'Meditation created successfully',
            data: meditation
        });
    } catch (error) {
        console.error('Create Meditation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create meditation',
            error: error.message
        });
    }
};

// Update meditation
export const updateMeditation = async (req, res) => {
    try {
        const { title, subtitle, description, duration, benefits, isActive, mediaId } = req.body;
        const meditation = await Meditation.findById(req.params.id);

        if (!meditation) {
            return res.status(404).json({ success: false, message: 'Meditation not found' });
        }

        const updateData = {
            ...(title !== undefined && { title }),
            ...(subtitle !== undefined && { subtitle }),
            ...(description !== undefined && { description }),
            ...(duration !== undefined && { duration: parseInt(duration) || 0 }),
            ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true })
        };

        if (benefits) {
            try {
                updateData.benefits = typeof benefits === 'string' ? JSON.parse(benefits) : benefits;
            } catch (e) {
                updateData.benefits = [benefits];
            }
        }

        if (mediaId) {
            const media = await Media.findById(mediaId);
            if (media) {
                updateData.media = mediaId;
                // Update thumbnail if not explicitly uploading a new one and media has one
                if (!(req.files && req.files.thumbnail && req.files.thumbnail[0]) && media.thumbnail && media.thumbnail !== meditation.thumbnail) {
                    updateData.thumbnail = media.thumbnail;
                }
            }
        }

        if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
            updateData.thumbnail = getMediaFileUrl(req.files.thumbnail[0], 'thumbnail');
        }

        const updatedMeditation = await Meditation.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('media');

        // Delete old files if they were replaced (only thumbnail)
        if (updateData.thumbnail && meditation.thumbnail && updateData.thumbnail !== meditation.thumbnail) {
            deleteFileIfExists(meditation.thumbnail);
        }

        res.status(200).json({
            success: true,
            message: 'Meditation updated successfully',
            data: updatedMeditation
        });
    } catch (error) {
        console.error('Update Meditation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update meditation',
            error: error.message
        });
    }
};

// Delete meditation
export const deleteMeditation = async (req, res) => {
    try {
        const meditation = await Meditation.findById(req.params.id);

        if (!meditation) {
            return res.status(404).json({ success: false, message: 'Meditation not found' });
        }

        // Delete files
        // We do not delete filePath (audio) since it may be a shared Media library file
        if (meditation.thumbnail) {
            deleteFileIfExists(meditation.thumbnail);
        }

        await Meditation.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Meditation deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete meditation',
            error: error.message
        });
    }
};
