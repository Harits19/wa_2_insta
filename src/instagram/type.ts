import MyDate from "../date/service";
import { Base64 } from "../resize/base-64/type";

export interface AlbumResponse {
  client_sidecar_id: string;
  media: Media;
  status: string;
}

export interface Media {
  pk: string;
  id: string;
  fbid: string;
  device_timestamp: number;
  caption_is_edited: boolean;
  strong_id__: string;
  deleted_reason: number;
  has_shared_to_fb: number;
  has_delayed_metadata: boolean;
  mezql_token: string;
  share_count_disabled: boolean;
  should_request_ads: boolean;
  is_reshare_of_text_post_app_media_in_ig: boolean;
  integrity_review_decision: string;
  client_cache_key: string;
  is_visual_reply_commenter_notice_enabled: boolean;
  like_and_view_counts_disabled: boolean;
  sticker_translations_enabled: boolean;
  is_post_live_clips_media: boolean;
  can_modify_carousel: boolean;
  is_quiet_post: boolean;
  has_privately_liked: boolean;
  filter_type: number;
  taken_at: number;
  can_see_insights_as_brand: boolean;
  media_type: number;
  code: string;
  caption: Caption;
  fundraiser_tag: FundraiserTag;
  sharing_friction_info: SharingFrictionInfo;
  timeline_pinned_user_ids: any[];
  has_views_fetching: boolean;
  original_media_has_visual_reply_media: boolean;
  fb_user_tags: FbUserTags;
  coauthor_producers: any[];
  coauthor_producer_can_see_organic_insights: boolean;
  invited_coauthor_producers: any[];
  is_in_profile_grid: boolean;
  profile_grid_control_enabled: boolean;
  user: User2;
  image_versions2: ImageVersions2;
  original_width: number;
  original_height: number;
  media_notes: MediaNotes;
  media_reposter_bottomsheet_enabled: boolean;
  enable_media_notes_production: boolean;
  product_type: string;
  is_paid_partnership: boolean;
  music_metadata: MusicMetadata;
  organic_tracking_token: string;
  ig_media_sharing_disabled: boolean;
  crosspost_metadata: CrosspostMetadata;
  boost_unavailable_identifier: any;
  boost_unavailable_reason: any;
  boost_unavailable_reason_v2: any;
  subscribe_cta_visible: boolean;
  is_cutout_sticker_allowed: boolean;
  cutout_sticker_info: any[];
  gen_ai_detection_method: GenAiDetectionMethod;
  fb_aggregated_like_count: number;
  fb_aggregated_comment_count: number;
  has_high_risk_gen_ai_inform_treatment: boolean;
  open_carousel_show_follow_button: boolean;
  is_tagged_media_shared_to_viewer_profile_grid: boolean;
  should_show_author_pog_for_tagged_media_shared_to_profile_grid: boolean;
  is_eligible_for_media_note_recs_nux: boolean;
  is_social_ufi_disabled: boolean;
  is_eligible_for_meta_ai_share: boolean;
  meta_ai_suggested_prompts: any[];
  can_reply: boolean;
  floating_context_items: any[];
  is_eligible_content_for_post_roll_ad: boolean;
  meta_ai_content_deep_dive_prompt_v2: MetaAiContentDeepDivePromptV2;
  is_open_to_public_submission: boolean;
  can_view_more_preview_comments: boolean;
  commenting_disabled_for_viewer: boolean;
  preview_comments: any[];
  comment_count: number;
  hide_view_all_comment_entrypoint: boolean;
  is_comments_gif_composer_enabled: boolean;
  comment_inform_treatment: CommentInformTreatment;
  has_hidden_comments: boolean;
  video_sticker_locales: any[];
  clips_tab_pinned_user_ids: any[];
  can_viewer_save: boolean;
  can_viewer_reshare: boolean;
  shop_routing_user_id: any;
  is_organic_product_tagging_eligible: boolean;
  igbio_product: any;
  featured_products: any[];
  product_suggestions: any[];
  open_carousel_submission_state: string;
  carousel_media_count: number;
  carousel_media: CarouselMedum[];
  carousel_media_pending_post_count: number;
  carousel_media_ids: string[];
}

export interface Caption {
  bit_flags: number;
  created_at: number;
  created_at_utc: number;
  did_report_as_spam: boolean;
  is_ranked_comment: boolean;
  pk: string;
  share_enabled: boolean;
  content_type: string;
  media_id: string;
  status: string;
  type: number;
  user_id: number;
  strong_id__: string;
  text: string;
  user: User;
  is_covered: boolean;
  private_reply_status: number;
}

export interface User {
  pk: number;
  pk_id: string;
  id: string;
  username: string;
  full_name: string;
  is_private: boolean;
  is_unpublished: boolean;
  has_onboarded_to_text_post_app: boolean;
  strong_id__: string;
  fbid_v2: string;
  is_verified: boolean;
  profile_pic_id: string;
  profile_pic_url: string;
}

export interface FundraiserTag {
  has_standalone_fundraiser: boolean;
}

export interface SharingFrictionInfo {
  bloks_app_url: any;
  should_have_sharing_friction: boolean;
  sharing_friction_payload: any;
}

export interface FbUserTags {
  in: any[];
}

export interface User2 {
  allowed_commenter_type: string;
  fbid_v2: string;
  feed_post_reshare_disabled: boolean;
  full_name: string;
  has_onboarded_to_text_post_app: boolean;
  id: string;
  is_private: boolean;
  is_unpublished: boolean;
  pk: number;
  pk_id: string;
  reel_auto_archive: string;
  show_account_transparency_details: boolean;
  show_insights_terms: boolean;
  strong_id__: string;
  third_party_downloads_enabled: number;
  username: string;
  account_type: number;
  can_see_quiet_post_attribution: boolean;
  account_badges: any[];
  can_boost_post: boolean;
  can_see_organic_insights: boolean;
  fan_club_info: FanClubInfo;
  has_anonymous_profile_picture: boolean;
  interop_messaging_user_fbid: string;
  is_verified: boolean;
  profile_pic_id: string;
  profile_pic_url: string;
  transparency_product_enabled: boolean;
}

export interface FanClubInfo {
  autosave_to_exclusive_highlight: any;
  connected_member_count: any;
  fan_club_id: any;
  fan_club_name: any;
  has_created_ssc: any;
  has_enough_subscribers_for_ssc: any;
  is_fan_club_gifting_eligible: any;
  is_fan_club_referral_eligible: any;
  is_free_trial_eligible: any;
  largest_public_bc_id: any;
  subscriber_count: any;
  fan_consideration_page_revamp_eligiblity: any;
}

export interface ImageVersions2 {
  candidates: Candidate[];
}

export interface Candidate {
  width: number;
  height: number;
  url: string;
  scans_profile: string;
  estimated_scans_sizes: number[];
}

export interface MediaNotes {
  items: any[];
}

export interface MusicMetadata {
  audio_type: any;
  music_canonical_id: string;
  pinned_media_ids: any;
  music_info: any;
  original_sound_info: any;
}

export interface CrosspostMetadata {}

export interface GenAiDetectionMethod {
  detection_method: string;
}

export interface MetaAiContentDeepDivePromptV2 {
  media_eligibility_result: string;
}

export interface CommentInformTreatment {
  action_type: any;
  should_have_inform_treatment: boolean;
  text: string;
  url: any;
}

export interface CarouselMedum {
  id: string;
  explore_pivot_grid: boolean;
  carousel_parent_id: string;
  strong_id__: string;
  pk: string;
  commerciality_status: string;
  product_type: string;
  media_type: number;
  image_versions2: ImageVersions22;
  original_width: number;
  original_height: number;
  featured_products: any[];
  fb_user_tags: FbUserTags2;
  shop_routing_user_id: any;
  sharing_friction_info: SharingFrictionInfo2;
  taken_at: number;
  product_suggestions: any[];
  video_sticker_locales: any[];
}

export interface ImageVersions22 {
  candidates: Candidate2[];
}

export interface Candidate2 {
  width: number;
  height: number;
  url: string;
  scans_profile: string;
  estimated_scans_sizes: number[];
}

export interface FbUserTags2 {
  in: any[];
}

export interface SharingFrictionInfo2 {
  bloks_app_url: any;
  should_have_sharing_friction: boolean;
  sharing_friction_payload: any;
}

export type VideoImageBuffer =
  | { type: "image"; buffer: Buffer | Base64 }
  | { type: "video"; buffer: Buffer | Base64; filename?: string };

export type VideoImageResizeResult = {
  video?: {
    buffer: Buffer;
    thumbnail: Buffer;
  };
  image?: Buffer;
};

export interface FilterMultiplePost {
  caption: string;
  startIndex: number;
}

export class ErrorMultiplePost extends Error {
  startIndex: number;
  constructor({
    message,
    startIndex,
  }: {
    message: string;
    startIndex: number;
  }) {
    super(message);
    this.startIndex = startIndex;
  }
}
