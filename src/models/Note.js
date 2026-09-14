const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Note content is required']
    },
    tags: {
      type: [String],
      default: []
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true
    },
    pnl: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId ? ret.userId.toString() : undefined;
        ret.createdAt = ret.created_at;
        ret.updatedAt = ret.updated_at;
        delete ret._id;
        delete ret.__v;
        delete ret.created_at;
        delete ret.updated_at;
        return ret;
      }
    }
  }
);

// Indexes for search and date filtering queries
noteSchema.index({ userId: 1, created_at: -1 });
noteSchema.index({ userId: 1, title: 1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
