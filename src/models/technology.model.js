import mongoose from 'mongoose';
import slugify from 'slugify';

const technologySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Technology name is required'],
    unique: true,
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
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: [true, 'Domain is required']
  },
  icon: {
    type: String,
    default: 'code'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for tutorials
technologySchema.virtual('tutorials', {
  ref: 'Tutorial',
  localField: '_id',
  foreignField: 'technology'
});

// Create slug before saving
technologySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

const Technology = mongoose.model('Technology', technologySchema);

export default Technology;