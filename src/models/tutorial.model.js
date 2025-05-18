import mongoose from 'mongoose';
import slugify from 'slugify';

const tutorialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  image: {
    type: String,
    default: 'default-tutorial.jpg'
  },
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: [true, 'Domain is required']
  },
  technology: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technology',
    required: [true, 'Technology is required']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  estimatedTime: {
    type: Number,  // in minutes
    default: 30
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for lessons
tutorialSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'tutorial'
});

// Calculate estimated time based on lessons
tutorialSchema.virtual('totalDuration').get(function() {
  if (this.lessons && this.lessons.length > 0) {
    return this.lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
  }
  return this.estimatedTime;
});

// Create slug before saving
tutorialSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Tutorial = mongoose.model('Tutorial', tutorialSchema);

export default Tutorial;