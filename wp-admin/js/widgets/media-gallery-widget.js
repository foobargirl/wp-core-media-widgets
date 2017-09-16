/* eslint consistent-this: [ "error", "control" ] */
(function( component, $ ) {
	'use strict';

	var GalleryWidgetModel, GalleryWidgetControl, GalleryDetailsMediaFrame;

	/**
	 * Custom gallery details frame.
	 *
	 * @class GalleryDetailsMediaFrame
	 * @constructor
	 */
	GalleryDetailsMediaFrame = wp.media.view.MediaFrame.Post.extend( {

		/**
		 * Create the default states.
		 *
		 * @returns {void}
		 */
		createStates: function createStates() {
			this.states.add([
				new wp.media.controller.Library({
					id:         'gallery',
					title:      wp.media.view.l10n.createGalleryTitle,
					priority:   40,
					toolbar:    'main-gallery',
					filterable: 'uploaded',
					multiple:   'add',
					editable:   true,

					library:  wp.media.query( _.defaults({
						type: 'image'
					}, this.options.library ) )
				}),

				// Gallery states.
				new wp.media.controller.GalleryEdit({
					library: this.options.selection,
					editing: this.options.editing,
					menu:    'gallery'
				}),

				new wp.media.controller.GalleryAdd()
			]);
		}
	} );

	/**
	 * Gallery widget model.
	 *
	 * See WP_Widget_Gallery::enqueue_admin_scripts() for amending prototype from PHP exports.
	 *
	 * @class GalleryWidgetModel
	 * @constructor
	 */
	GalleryWidgetModel = component.MediaWidgetModel.extend( {} );

	/**
	 * Gallery widget control.
	 *
	 * See WP_Widget_Gallery::enqueue_admin_scripts() for amending prototype from PHP exports.
	 *
	 * @class GalleryWidgetControl
	 * @constructor
	 */
	GalleryWidgetControl = component.MediaWidgetControl.extend( {

		events: _.extend( {}, component.MediaWidgetControl.prototype.events, {
			'click .media-widget-preview': 'editMedia'
		} ),

		/**
		 * Initialize.
		 *
		 * @param {Object}         options - Options.
		 * @param {Backbone.Model} options.model - Model.
		 * @param {jQuery}         options.el - Control field container element.
		 * @param {jQuery}         options.syncContainer - Container element where fields are synced for the server.
		 * @returns {void}
		 */
		initialize: function initialize( options ) {
			var control = this;

			component.MediaWidgetControl.prototype.initialize.call( control, options );

			_.bindAll( control, 'updateSelectedAttachments' );
			control.selectedAttachments = new wp.media.model.Attachments();
			control.model.on( 'change:ids', control.updateSelectedAttachments );
			control.selectedAttachments.on( 'change', control.renderPreview );
			control.selectedAttachments.on( 'reset', control.renderPreview );
			control.updateSelectedAttachments();
		},

		/**
		 * Update the selected attachments if necessary.
		 *
		 * @returns {void}
		 */
		updateSelectedAttachments: function updateSelectedAttachments() {
			var control = this, newIds, oldIds, removedIds, addedIds, addedQuery;

			newIds = control.parseIdList( control.model.get( 'ids' ) );
			oldIds = _.pluck( control.selectedAttachments.models, 'id' );

			removedIds = _.difference( oldIds, newIds );
			_.each( removedIds, function( removedId ) {
				control.selectedAttachments.remove( control.selectedAttachments.get( removedId ) );
			});

			addedIds = _.difference( newIds, oldIds );
			if ( addedIds.length ) {
				addedQuery = wp.media.query({
					order: 'ASC',
					orderby: 'post__in',
					perPage: -1,
					post__in: newIds,
					query: true,
					type: 'image'
				});
				addedQuery.more().done( function() {
					control.selectedAttachments.reset( addedQuery.models );
				});
			}
		},

		/**
		 * Parse ID list.
		 *
		 * @param {Array|string} ids - ID list.
		 * @returns {Array} Valid integers.
		 */
		parseIdList: function( ids ) {
			var parsedIds;
			if ( 'string' === typeof ids ) {
				parsedIds = ids.split( ',' );
			} else {
				parsedIds = ids;
			}
			return _.filter(
				_.map( parsedIds, function( id ) {
					return parseInt( id, 10 );
				},
				function( id ) {
					return 'number' === typeof id;
				}
			) );
		},

		/**
		 * Render preview.
		 *
		 * @returns {void}
		 */
		renderPreview: function renderPreview() {
			var control = this, previewContainer, previewTemplate, data;

			previewContainer = control.$el.find( '.media-widget-preview' );
			previewTemplate = wp.template( 'wp-media-widget-gallery-preview' );

			data = control.previewTemplateProps.toJSON();
			data.ids = control.parseIdList( data.ids );
			data.attachments = {};
			control.selectedAttachments.each( function( attachment ) {
				data.attachments[ attachment.id ] = attachment.toJSON();
			} );

			previewContainer.html( previewTemplate( data ) );
		},

		/**
		 * Determine whether there are selected attachments.
		 *
		 * @returns {boolean} Selected.
		 */
		isSelected: function isSelected() {
			var control = this, ids;

			if ( control.model.get( 'error' ) ) {
				return false;
			}

			ids = control.parseIdList( control.model.get( 'ids' ) );
			return ids.length > 0;
		},

		/**
		 * Sync the model attributes to the hidden inputs, and update previewTemplateProps.
		 *
		 * @todo Patch this in core to eliminate need for override.
		 * @returns {void}
		 */
		syncModelToInputs: function syncModelToInputs() {
			var control = this;
			control.syncContainer.find( '.media-widget-instance-property' ).each( function() {
				var input = $( this ), value, propertyName = input.data( 'property' );
				value = control.model.get( propertyName );
				if ( _.isUndefined( value ) ) {
					return;
				}

				// @todo Support comma-separated ID list arrays?
				if ( 'boolean' === control.model.schema[ propertyName ].type ) {
					value = value ? '1' : ''; // Because in PHP, strval( true ) === '1' && strval( false ) === ''.
				} else {
					value = String( value );
				}

				if ( input.val() !== value ) {
					input.val( value );
					input.trigger( 'change' );
				}
			});
		},

		/**
		 * Open the media select frame to edit images.
		 *
		 * @returns {void}
		 */
		editMedia: function editMedia() {
			var control = this, selection, mediaFrame, defaultSync, mediaFrameProps;
			selection = new wp.media.model.Selection( control.selectedAttachments.models, {
				multiple: true
			} );

			selection.gallery = new Backbone.Model({
				_orderbyRandom: control.model.get( 'orderby_random' )
			});

			mediaFrameProps = control.mapModelToMediaFrameProps( control.model.toJSON() );
			if ( mediaFrameProps.size ) {
				control.displaySettings.set( 'size', mediaFrameProps.size );
			}
			mediaFrame = new GalleryDetailsMediaFrame({
				frame: 'manage',
				text: control.l10n.add_to_widget,
				selection: selection,
				mimeType: control.mime_type,
				selectedDisplaySettings: control.displaySettings,
				showDisplaySettings: control.showDisplaySettings,
				metadata: mediaFrameProps,
				editing:   true,
				multiple:  true,
				state: 'gallery-edit'
			});
			wp.media.frame = mediaFrame; // See wp.media().

			// Handle selection of a media item.
			mediaFrame.on( 'update', function onUpdate( selections ) {
				var state = mediaFrame.state(), selectedImages;

				selectedImages = selections || state.get( 'selection' );

				if ( ! selectedImages ) {
					return;
				}

				// Copy orderby_random from gallery state.
				if ( selectedImages.gallery ) {
					control.model.set( 'orderby_random', selectedImages.gallery.get( '_orderbyRandom' ) );
				}

				// Directly update selectedAttachments to prevent needing to do additional request.
				control.selectedAttachments.reset( selectedImages.models );

				// Update models in the widget instance.
				control.model.set( {
					ids: _.pluck( selectedImages.models, 'id' ).join( ',' )
				} );
			} );

			// Disable syncing of attachment changes back to server. See <https://core.trac.wordpress.org/ticket/40403>.
			defaultSync = wp.media.model.Attachment.prototype.sync;
			wp.media.model.Attachment.prototype.sync = function rejectedSync() {
				return $.Deferred().rejectWith( this ).promise();
			};
			mediaFrame.on( 'close', function onClose() {
				wp.media.model.Attachment.prototype.sync = defaultSync;
			});

			mediaFrame.$el.addClass( 'media-widget' );
			mediaFrame.open();

			// Clear the selected attachment when it is deleted in the media select frame.
			if ( selection ) {
				selection.on( 'destroy', function onDestroy( attachment ) {
					control.model.set( {
						ids: _.difference(
							control.parseIdList( control.model.get( 'ids' ) ),
							[ attachment.id ]
						).join( ',' ) // @todo Array.
					} );
				});
			}
		},

		/**
		 * Open the media select frame to chose an item.
		 *
		 * @returns {void}
		 */
		selectMedia: function selectMedia() {
			var control = this, selection, mediaFrame, defaultSync, mediaFrameProps;
			if ( control.isSelected() && 0 !== control.model.get( 'selection' ) ) {
				selection = new wp.media.model.Selection( [ control.selectedAttachment ] );
			} else {
				selection = null;
			}

			mediaFrameProps = control.mapModelToMediaFrameProps( control.model.toJSON() );
			if ( mediaFrameProps.size ) {
				control.displaySettings.set( 'size', mediaFrameProps.size );
			}
			mediaFrame = new GalleryDetailsMediaFrame({
				frame: 'select',
				text: control.l10n.add_to_widget,
				selection: selection,
				mimeType: control.mime_type,
				selectedDisplaySettings: control.displaySettings,
				showDisplaySettings: control.showDisplaySettings,
				metadata: mediaFrameProps,
				state: 'gallery'
			});
			wp.media.frame = mediaFrame; // See wp.media().

			// Handle selection of a media item.
			mediaFrame.on( 'update', function onUpdate( selections ) {
				var state = mediaFrame.state(), selectedImages;

				selectedImages = selections || state.get( 'selection' );

				if ( ! selectedImages ) {
					return;
				}

				// Copy orderby_random from gallery state.
				if ( selectedImages.gallery ) {
					control.model.set( 'orderby_random', selectedImages.gallery.get( '_orderbyRandom' ) );
				}

				// Directly update selectedAttachments to prevent needing to do additional request.
				control.selectedAttachments.reset( selectedImages.models );

				// Update widget instance.
				control.model.set( {
					ids: _.pluck( selectedImages.models, 'id' ).join( ',' ) // @todo Allow array.
				} );
			} );

			// Disable syncing of attachment changes back to server. See <https://core.trac.wordpress.org/ticket/40403>.
			defaultSync = wp.media.model.Attachment.prototype.sync;
			wp.media.model.Attachment.prototype.sync = function rejectedSync() {
				return $.Deferred().rejectWith( this ).promise();
			};
			mediaFrame.on( 'close', function onClose() {
				wp.media.model.Attachment.prototype.sync = defaultSync;
			});

			mediaFrame.$el.addClass( 'media-widget' );
			mediaFrame.open();

			// Clear the selected attachment when it is deleted in the media select frame.
			if ( selection ) {
				selection.on( 'destroy', function onDestroy( attachment ) {
					control.model.removeAttachmentId( attachment.get( 'id' ) );
				});
			}

			/*
			 * Make sure focus is set inside of modal so that hitting Esc will close
			 * the modal and not inadvertently cause the widget to collapse in the customizer.
			 */
			mediaFrame.$el.find( ':focusable:first' ).focus();
		}

	} );

	// Exports.
	component.controlConstructors.media_gallery = GalleryWidgetControl;
	component.modelConstructors.media_gallery = GalleryWidgetModel;

})( wp.mediaWidgets, jQuery );
