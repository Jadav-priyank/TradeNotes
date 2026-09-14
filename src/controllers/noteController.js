const mongoose = require('mongoose');
const Note = require('../models/Note');

function formatTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean);
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.map(t => String(t).trim()).filter(Boolean);
    } catch {
      // Comma-separated string
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  return [];
}

function serializeNote(note) {
  if (!note) return null;
  const raw = typeof note.toObject === 'function' ? note.toObject() : note;
  return {
    id: (raw._id ? raw._id.toString() : raw.id),
    userId: (raw.userId ? raw.userId.toString() : raw.user_id),
    title: raw.title,
    imageUrl: raw.imageUrl || '',
    pnl: typeof raw.pnl === 'number' ? raw.pnl : (parseFloat(raw.pnl) || 0),
    content: raw.content,
    tags: formatTags(raw.tags),
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt
  };
}

// 1. Create a new note for the authenticated user
async function createNote(req, res) {
  try {
    const { title, content, tags, imageUrl, pnl } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note title is required and cannot be empty.'
      });
    }

    if (content === undefined || content === null || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Note content is required.'
      });
    }

    const formattedTags = formatTags(tags);
    const parsedPnl = pnl !== undefined && pnl !== null && pnl !== '' ? (parseFloat(pnl) || 0) : 0;

    const notePayload = {
      userId: req.user.id,
      title: title.trim(),
      imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : '',
      pnl: parsedPnl,
      content: content.trim(),
      tags: formattedTags
    };

    if (req.body.createdAt || req.body.date) {
      const customDate = new Date(req.body.createdAt || req.body.date);
      if (!isNaN(customDate.getTime())) {
        notePayload.created_at = customDate;
      }
    }

    const newNote = await Note.create(notePayload);

    return res.status(201).json({
      success: true,
      message: 'Note created successfully.',
      data: serializeNote(newNote)
    });
  } catch (error) {
    console.error('Create note error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create note.'
    });
  }
}

// 2. Get notes for the authenticated user with search and date filtering
async function getNotes(req, res) {
  try {
    const {
      search,
      title,
      date,
      month,
      startDate,
      endDate,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Build filter query scoped to req.user.id
    const filter = {
      userId: req.user.id
    };

    // Search by title or full text
    if (title && title.trim()) {
      filter.title = { $regex: title.trim(), $options: 'i' };
    } else if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { content: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Filter by Month (YYYY-MM)
    if (month && typeof month === 'string' && month.trim()) {
      const parts = month.trim().split('-');
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
          const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
          const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
          filter.created_at = { $gte: startOfMonth, $lte: endOfMonth };
        }
      }
    } else if (date && date.trim()) {
      // Filter by single exact date (YYYY-MM-DD)
      const d = date.trim();
      const startOfDay = new Date(`${d}T00:00:00.000Z`);
      const endOfDay = new Date(`${d}T23:59:59.999Z`);
      if (!isNaN(startOfDay.getTime())) {
        filter.created_at = { $gte: startOfDay, $lte: endOfDay };
      }
    } else {
      const dateFilter = {};
      if (startDate && startDate.trim()) {
        const start = new Date(`${startDate.trim()}T00:00:00.000Z`);
        if (!isNaN(start.getTime())) {
          dateFilter.$gte = start;
        }
      }
      if (endDate && endDate.trim()) {
        const end = new Date(`${endDate.trim()}T23:59:59.999Z`);
        if (!isNaN(end.getTime())) {
          dateFilter.$lte = end;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.created_at = dateFilter;
      }
    }

    // Sorting
    const sortFieldMap = {
      createdat: 'created_at',
      updatedat: 'updated_at',
      title: 'title',
      id: '_id'
    };

    const sortColumn = sortFieldMap[String(sortBy).toLowerCase()] || 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 1 : -1;

    // Count total matches
    const totalCount = await Note.countDocuments(filter);

    // Calculate Total PnL for the current filter
    const pnlMatch = { ...filter };
    if (typeof pnlMatch.userId === 'string') {
      pnlMatch.userId = new mongoose.Types.ObjectId(pnlMatch.userId);
    }
    const pnlAgg = await Note.aggregate([
      { $match: pnlMatch },
      { $group: { _id: null, sumPnL: { $sum: { $ifNull: ['$pnl', 0] } } } }
    ]);
    const totalPnL = pnlAgg.length > 0 ? (pnlAgg[0].sumPnL || 0) : 0;

    // Fetch paginated notes
    const notes = await Note.find(filter)
      .sort({ [sortColumn]: sortOrder })
      .skip(offset)
      .limit(limitNum);

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        notes: notes.map(serializeNote),
        totalPnL: Math.round(totalPnL * 100) / 100,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: totalPages === 0 ? 1 : totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters: {
          search: search || null,
          title: title || null,
          date: date || null,
          startDate: startDate || null,
          endDate: endDate || null,
          sortBy,
          order: sortOrder === 1 ? 'asc' : 'desc'
        }
      }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notes.'
    });
  }
}

// 3. Get single note by ID
async function getNoteById(req, res) {
  try {
    const noteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note ID.'
      });
    }

    const note = await Note.findOne({ _id: noteId, userId: req.user.id });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeNote(note)
    });
  } catch (error) {
    console.error('Get note by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve note.'
    });
  }
}

// 4. Update note by ID
async function updateNote(req, res) {
  try {
    const noteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note ID.'
      });
    }

    const existing = await Note.findOne({ _id: noteId, userId: req.user.id });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    const { title, content, tags, imageUrl, pnl } = req.body;

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot be empty.'
      });
    }

    if (content !== undefined && typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Content must be a string.'
      });
    }

    if (title !== undefined) existing.title = title.trim();
    if (content !== undefined) existing.content = content.trim();
    if (tags !== undefined) existing.tags = formatTags(tags);
    if (imageUrl !== undefined) existing.imageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    if (pnl !== undefined) existing.pnl = pnl === null || pnl === '' ? 0 : (parseFloat(pnl) || 0);
    if (req.body.createdAt || req.body.date) {
      const customDate = new Date(req.body.createdAt || req.body.date);
      if (!isNaN(customDate.getTime())) {
        existing.created_at = customDate;
      }
    }

    await existing.save();

    return res.status(200).json({
      success: true,
      message: 'Note updated successfully.',
      data: serializeNote(existing)
    });
  } catch (error) {
    console.error('Update note error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update note.'
    });
  }
}

// 5. Delete note by ID
async function deleteNote(req, res) {
  try {
    const noteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note ID.'
      });
    }

    const deleted = await Note.findOneAndDelete({ _id: noteId, userId: req.user.id });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully.'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete note.'
    });
  }
}

// 6. User's Note Statistics & Timeline Summary
async function getNoteSummary(req, res) {
  try {
    const totalCount = await Note.countDocuments({ userId: req.user.id });
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    // Sum total PnL across all notes
    const pnlAgg = await Note.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, sumPnL: { $sum: { $ifNull: ['$pnl', 0] } } } }
    ]);
    const overallPnL = pnlAgg.length > 0 ? (pnlAgg[0].sumPnL || 0) : 0;

    // Monthly breakdown (Month-wise note counts and PnL)
    const monthlyBreakdown = await Note.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } },
          count: { $sum: 1 },
          totalPnL: { $sum: { $ifNull: ['$pnl', 0] } }
        }
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          month: '$_id',
          count: 1,
          totalPnL: { $round: ['$totalPnL', 2] }
        }
      }
    ]);

    // Notes created per date (last 7 active days)
    const dateBreakdown = await Note.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 7 },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalNotes: totalCount,
        totalPnL: Math.round(overallPnL * 100) / 100,
        monthlyBreakdown,
        recentActivity: dateBreakdown
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get summary.'
    });
  }
}

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getNoteSummary
};
