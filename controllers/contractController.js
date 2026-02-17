const Contract = require('../models/Contract');
const Influencer = require('../models/Influencer');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const crypto = require('crypto');
const { sendEmail, generateContractEmail, generateAcceptanceNotificationEmail } = require('../utils/sendEmail');

// @desc    Get all contracts for current user
// @route   GET /api/contracts
// @access  Private
exports.getContracts = async (req, res) => {
  try {
    const contracts = await Contract.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .populate('sentContracts.influencer', 'name email profileImage')
      .populate('sentContracts.campaign', 'name status');

    res.status(200).json({
      success: true,
      count: contracts.length,
      data: contracts
    });
  } catch (error) {
    console.error('Error getting contracts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contracts'
    });
  }
};

// @desc    Get single contract
// @route   GET /api/contracts/:id
// @access  Private
exports.getContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    })
      .populate('sentContracts.influencer', 'name email profileImage')
      .populate('sentContracts.campaign', 'name status');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    res.status(200).json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error getting contract:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contract'
    });
  }
};

// @desc    Create contract
// @route   POST /api/contracts
// @access  Private
exports.createContract = async (req, res) => {
  try {
    const { title, content } = req.body;

    const contract = await Contract.create({
      title,
      content,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create contract'
    });
  }
};

// @desc    Update contract
// @route   PUT /api/contracts/:id
// @access  Private
exports.updateContract = async (req, res) => {
  try {
    const { title, content } = req.body;

    let contract = await Contract.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    contract.title = title || contract.title;
    contract.content = content || contract.content;
    await contract.save();

    res.status(200).json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contract'
    });
  }
};

// @desc    Delete contract
// @route   DELETE /api/contracts/:id
// @access  Private
exports.deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contract deleted'
    });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contract'
    });
  }
};

// @desc    Send contract to influencer
// @route   POST /api/contracts/:id/send
// @access  Private
exports.sendContract = async (req, res) => {
  try {
    const { influencerId, campaignId } = req.body;

    // Get contract
    const contract = await Contract.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Get influencer
    const influencer = await Influencer.findById(influencerId);
    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    if (!influencer.email) {
      return res.status(400).json({
        success: false,
        message: 'Influencer does not have an email address'
      });
    }

    // Get campaign if provided
    let campaign = null;
    if (campaignId) {
      campaign = await Campaign.findById(campaignId);
    }

    // Get brand/user info
    const user = await User.findById(req.user.id);
    const brandName = user.company?.name || user.name || 'A Brand';

    // Generate response token
    const responseToken = crypto.randomBytes(32).toString('hex');

    // Create sent contract entry
    const sentContract = {
      influencer: influencer._id,
      influencerEmail: influencer.email,
      influencerName: influencer.name,
      campaign: campaign?._id,
      campaignName: campaign?.name,
      responseToken,
      status: 'pending',
      sentAt: new Date()
    };

    contract.sentContracts.push(sentContract);
    await contract.save();

    // Generate response URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const responseUrl = `${frontendUrl}/contract/respond/${responseToken}`;

    // Generate and send email
    const emailContent = generateContractEmail({
      influencerName: influencer.name,
      brandName,
      campaignName: campaign?.name,
      contractTitle: contract.title,
      contractContent: contract.content,
      responseUrl
    });

    await sendEmail({
      to: influencer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    // Return the updated contract with the new sent contract
    const updatedContract = await Contract.findById(contract._id)
      .populate('sentContracts.influencer', 'name email profileImage')
      .populate('sentContracts.campaign', 'name status');

    res.status(200).json({
      success: true,
      message: `Contract sent to ${influencer.name}`,
      data: updatedContract
    });
  } catch (error) {
    console.error('Error sending contract:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send contract'
    });
  }
};

// @desc    Get contract by response token (public)
// @route   GET /api/contracts/respond/:token
// @access  Public
exports.getContractByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const contract = await Contract.findOne({
      'sentContracts.responseToken': token
    }).populate('createdBy', 'name email company');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found or link has expired'
      });
    }

    const sentContract = contract.sentContracts.find(
      sc => sc.responseToken === token
    );

    if (!sentContract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Get brand info
    const brandName = contract.createdBy?.company?.name || contract.createdBy?.name || 'Brand';
    const brandEmail = contract.createdBy?.email;

    res.status(200).json({
      success: true,
      data: {
        title: contract.title,
        content: contract.content,
        brandName,
        brandEmail,
        campaignName: sentContract.campaignName,
        influencerName: sentContract.influencerName,
        status: sentContract.status,
        sentAt: sentContract.sentAt,
        respondedAt: sentContract.respondedAt
      }
    });
  } catch (error) {
    console.error('Error getting contract by token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contract'
    });
  }
};

// @desc    Respond to contract (public)
// @route   POST /api/contracts/respond/:token
// @access  Public
exports.respondToContract = async (req, res) => {
  try {
    const { token } = req.params;
    const { action } = req.body; // 'accept', 'reject', 'connect'

    if (!['accept', 'reject', 'connect'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be accept, reject, or connect'
      });
    }

    const contract = await Contract.findOne({
      'sentContracts.responseToken': token
    }).populate('createdBy', 'name email company');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found or link has expired'
      });
    }

    const sentContractIndex = contract.sentContracts.findIndex(
      sc => sc.responseToken === token
    );

    if (sentContractIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    const sentContract = contract.sentContracts[sentContractIndex];

    // Update status based on action
    const statusMap = {
      accept: 'accepted',
      reject: 'rejected',
      connect: 'connected'
    };

    sentContract.status = statusMap[action];
    sentContract.respondedAt = new Date();

    contract.sentContracts[sentContractIndex] = sentContract;
    await contract.save();

    // If accepted, send notification to brand
    if (action === 'accept') {
      const brandEmail = contract.createdBy?.email;
      if (brandEmail) {
        const brandName = contract.createdBy?.company?.name || contract.createdBy?.name || 'Brand';

        const notificationEmail = generateAcceptanceNotificationEmail({
          brandName,
          brandEmail,
          influencerName: sentContract.influencerName,
          influencerEmail: sentContract.influencerEmail,
          campaignName: sentContract.campaignName,
          contractTitle: contract.title
        });

        try {
          await sendEmail({
            to: brandEmail,
            subject: notificationEmail.subject,
            html: notificationEmail.html,
            text: notificationEmail.text
          });
        } catch (emailError) {
          console.error('Failed to send acceptance notification:', emailError);
          // Don't fail the response if notification fails
        }
      }
    }

    res.status(200).json({
      success: true,
      message: action === 'accept'
        ? 'Contract accepted! The brand has been notified.'
        : action === 'reject'
        ? 'Contract rejected.'
        : 'Connection request sent. Please email the brand directly.',
      data: {
        status: sentContract.status,
        brandEmail: action === 'connect' ? contract.createdBy?.email : undefined
      }
    });
  } catch (error) {
    console.error('Error responding to contract:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to contract'
    });
  }
};

// @desc    Get contract status for an influencer in a campaign
// @route   GET /api/contracts/status/:influencerId/:campaignId
// @access  Private
exports.getContractStatus = async (req, res) => {
  try {
    const { influencerId, campaignId } = req.params;

    const contract = await Contract.findOne({
      createdBy: req.user.id,
      'sentContracts.influencer': influencerId,
      'sentContracts.campaign': campaignId
    });

    if (!contract) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    const sentContract = contract.sentContracts.find(
      sc => sc.influencer.toString() === influencerId &&
           sc.campaign?.toString() === campaignId
    );

    res.status(200).json({
      success: true,
      data: sentContract ? {
        status: sentContract.status,
        sentAt: sentContract.sentAt,
        respondedAt: sentContract.respondedAt,
        contractId: contract._id,
        contractTitle: contract.title
      } : null
    });
  } catch (error) {
    console.error('Error getting contract status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contract status'
    });
  }
};

// @desc    Get all sent contracts for a campaign
// @route   GET /api/contracts/campaign/:campaignId
// @access  Private
exports.getContractsByCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const contracts = await Contract.find({
      createdBy: req.user.id,
      'sentContracts.campaign': campaignId
    }).populate('sentContracts.influencer', 'name email profileImage');

    // Extract sent contracts for this campaign
    const sentContracts = [];
    contracts.forEach(contract => {
      contract.sentContracts.forEach(sc => {
        if (sc.campaign?.toString() === campaignId) {
          sentContracts.push({
            contractId: contract._id,
            contractTitle: contract.title,
            influencer: sc.influencer,
            influencerId: sc.influencer?._id || sc.influencer,
            status: sc.status,
            sentAt: sc.sentAt,
            respondedAt: sc.respondedAt
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: sentContracts
    });
  } catch (error) {
    console.error('Error getting contracts by campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contracts'
    });
  }
};
