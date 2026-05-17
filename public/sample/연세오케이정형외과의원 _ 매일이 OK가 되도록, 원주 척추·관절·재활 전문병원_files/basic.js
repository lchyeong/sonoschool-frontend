let lenis;
let lenisRafId;

$(window).on('load', function () {
    $(".ms-preloader").animate({"opacity": "0"}, 1200, "easeInOutCubic", function () {
        $(".ms-preloader").css("visibility", "hidden");
    });

})



// Lenis 초기화 함수
function initLenis() {
    if (!lenis && window.innerWidth > 1240) {
        lenis = new Lenis({
            duration: 1.0,
            infinite: false,
            gestureOrientation: "vertical",
            normalizeWheel: false,
            smoothTouch: true,
    
        });

        function raf(time) {
            lenis.raf(time);
            lenisRafId = requestAnimationFrame(raf);
        }

        lenisRafId = requestAnimationFrame(raf);

        addScrollEventListeners();
    }
}

// Lenis 제거 함수
function destroyLenis() {
    if (lenis) {
        cancelAnimationFrame(lenisRafId);
        lenis.destroy();
        lenis = null;
        lenisRafId = null;

        removeScrollEventListeners();
    }
}

// lenis.stop();




// 내부 스크롤 가능한 요소 이벤트 리스너 추가
function addScrollEventListeners() {
    const scrollableContainers = document.querySelectorAll(
        '.flagship_sub .building_sect .info_cont, .depart_map_sect .map_cont .aside .map_li'
    );
    scrollableContainers.forEach((container) => {
        container.addEventListener('wheel', handleWheelEvent, {passive: false});
    });
}

// 내부 스크롤 가능한 요소 이벤트 리스너 제거
function removeScrollEventListeners() {
    const scrollableContainers = document.querySelectorAll(
        '.flagship_sub .building_sect .info_cont, .depart_map_sect .map_cont .aside .map_li'
    );
    scrollableContainers.forEach((container) => {
        container.removeEventListener('wheel', handleWheelEvent);
    });
}




// 초기 설정
initLenis();

// 리사이즈 시 Lenis 활성화/비활성화
window.addEventListener("resize", () => {
    if (window.innerWidth > 1240) {
        initLenis(); // PC 화면에서는 Lenis 초기화
    }else {
        destroyLenis(); // 모바일 화면에서는 Lenis 비활성화
    }
});

// Lenis 스크롤 애니메이션 프레임 관리
function smoothScroll() {
    function raf(time) {
        if (lenis) lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
}


$(document).ready(function () {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // resize
    window.addEventListener('resize', () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    })


    $('.share-btn').click(function(event) {
        event.stopPropagation(); // 클릭 이벤트 전파 중지
        $('.share_area').toggleClass('on');
    });

    $(document).click(function(event) {
        if (!$(event.target).closest('.share_area').length && !$(event.target).closest('.share_btn').length) {
            $('.share_area').removeClass('on');
        }
    });




    //브라우저 스크롤 크기 감지
    var scrollingElement = document.scrollingElement;
    var scrollWidth = window.innerWidth - scrollingElement.clientWidth
    var root = document.querySelector(':root');
    let styles = getComputedStyle(root);
    styles.getPropertyValue('--scroll-width');
    root.style.setProperty('--scroll-width', scrollWidth+'px');



    // 연세 Form
    // placeholder
    if ($('.form_box .inp input').length) {
        $('.form_box .inp input').on('input blur', function () {
            const $input = $(this);
            const hasValue = $input.val().trim() !== '';
            const $placeholder = $input.next('.placeholder');

            if (hasValue) {
                $placeholder.css('opacity', 0);
            } else if (!$input.is(':focus')) {
                $placeholder.css('opacity', 1);
            }
        });
    }

    // Select Form placeholder
    $(document).on('click', '.form_box .nice-select .option:not(.disabled)', function () {
        const $niceSelect = $(this).closest('.nice-select');
        const selectedText = $(this).text().trim();

        if (selectedText && selectedText !== '상담내용') {
            $niceSelect.find('.current').css('opacity', 1);
        } else {
            $niceSelect.find('.current').css('opacity', 0);
        }
    });

    $('#qCategory').on('change', function () {
        if ($(this).val()) {
            $(this).siblings('.placeholder').css('opacity', 0);
        } else {
            $(this).siblings('.placeholder').css('opacity', 1);
        }
    });


    // 연세 OK 시스템
    if(document.querySelector(".system_sect")){
        // 반응형 코드 추가
        // 1) 공통: name 기준으로 데스크탑/모바일/배경클래스 모두 동기화
        function setActiveByName(name){
            const $root = $('.system_sect');

            // 데스크탑
            $root.find('.txt_wrap .txt_cont').removeClass('active')
                .filter('[data-name="'+ name +'"]').addClass('active');

            // 모바일
            $root.find('.spe_box_wrap .spe_box').removeClass('active')
                .filter('[data-name="'+ name +'"]').addClass('active');

            $root.find('.cont').removeClass('num1 num2 num3 num4 num5 num6').addClass(name);
        }

        // 2) 자동 순환: 다음 항목으로 이동 (데스크탑 기준 목록을 사용)
        function activateNext(){
            const $items = $('.system_sect .txt_wrap .txt_cont');
            let $current = $items.filter('.active');
            if(!$current.length) $current = $items.first();

            let $next = $current.next('.txt_cont');
            if(!$next.length) $next = $items.first();

            setActiveByName($next.data('name'));
        }

        // 3) 자동재생 컨트롤 (기존 intervalId를 쓰고 있으면 그대로 사용)
        var intervalId = typeof intervalId !== 'undefined' ? intervalId : null;
        function startAutoRotate(){ if(!intervalId) intervalId = setInterval(activateNext, 3000); }
        function stopAutoRotate(){ if(intervalId){ clearInterval(intervalId); intervalId = null; } }

        // 4) 데스크탑: hover 시 정지 & 해당 name 활성
        $('.system_sect .txt_wrap .txt_cont').on('mouseenter', function(){
            stopAutoRotate();
            setActiveByName($(this).data('name'));
        }).on('mouseleave', function(){
            startAutoRotate();
        });

        // 5) 모바일: 카드 탭/터치 시 정지 & 해당 name 활성
        $('.system_sect .spe_box_wrap .spe_box').on('click touchend', function(e){
            e.preventDefault();
            stopAutoRotate();
            setActiveByName($(this).data('name'));
        });

        // 6) 초기 상태 동기화 + 자동재생 시작
        (function initSystemSect(){
            const $firstActive = $('.system_sect .txt_wrap .txt_cont.active');
            const initialName = ($firstActive.data('name')) || $('.system_sect .txt_wrap .txt_cont').first().data('name');
            if(initialName) setActiveByName(initialName);
            startAutoRotate();
        })();



        // 하단에 있던 옵저버
        let systemChk = true;

        const oneStop2 = new IntersectionObserver((entries) => {

            entries.forEach((entry) => {
                const $target = entry.target;
                if (entry.isIntersecting) {
                    $target.classList.add("active");
                    if (systemChk) {
                        startAutoRotate();
                        systemChk = false
                    }

                }

            });
        }, {threshold: .5});

        const $oneStopItems2 = document.querySelectorAll(".system_sect .cont")
        $oneStopItems2.forEach((item) => {
            oneStop2.observe(item);
        });

    }



    function ScrollXArr() {
        // Check if top_tab exists
        if ($('.top_tab').length === 0) {
            return; // Exit the function if top_tab doesn't exist
        }


        // Add 'first' class to top_tab
        $('.top_tab').addClass('first');

        $('.top_tab .wrap').on('scroll', function () {
            var tabScroll = $(this).scrollLeft();
            var maxScroll = $(this)[0].scrollWidth - $(this).width();

            if (tabScroll >= maxScroll -1 ) {
                // Scrolled to the end
                $('.top_tab').addClass('last').removeClass('first');
            } else if (tabScroll === 0) {
                // Scrolled to the beginning
                $('.top_tab').addClass('first').removeClass('last');
            }
        });
    }
    ScrollXArr()



    function moveToSlide(slideIndex) {
        mySwiper.slideTo(slideIndex);
    }




    function beforeSlide(){

        //비교 슬라이더1
        const slider = document.getElementById('compare-slider');
        const before = document.getElementById('before-image');




        if (before){

            const beforeImage = before.getElementsByTagName('img')[0];
            const resizer = document.getElementById('resizer');

            let active = false;

            //Sort overflow out for Overlay Image
            document.addEventListener("DOMContentLoaded", function() {
                let width = slider.offsetWidth;
                // console.log(width);
                beforeImage.style.width = width + 'px';
            });

            //Adjust width of image on resize
            window.addEventListener('resize', function() {


                let width = slider.offsetWidth;
                // console.log(width);
                beforeImage.style.width = width + 'px';
            })

            resizer.addEventListener('mousedown',function(){
                active = true;
                resizer.classList.add('resize');

            });

            document.body.addEventListener('mouseup',function(){
                active = false;
                resizer.classList.remove('resize');
            });

            document.body.addEventListener('mouseleave', function() {
                active = false;
                resizer.classList.remove('resize');
            });

            document.body.addEventListener('mousemove',function(e){
                if (!active) return;
                let x = e.pageX;
                x -= slider.getBoundingClientRect().left;
                slideIt(x);
                pauseEvent(e);
            });

            resizer.addEventListener('touchstart',function(){
                active = true;
                resizer.classList.add('resize');
            });

            document.body.addEventListener('touchend',function(){
                active = false;
                resizer.classList.remove('resize');
            });

            document.body.addEventListener('touchcancel',function(){
                active = false;
                resizer.classList.remove('resize');
            });

            //calculation for dragging on touch devices
            document.body.addEventListener('touchmove',function(e){
                if (!active) return;
                let x;

                let i;
                for (i=0; i < e.changedTouches.length; i++) {
                    x = e.changedTouches[i].pageX;
                }

                x -= slider.getBoundingClientRect().left;
                slideIt(x);
                pauseEvent(e);
            });

            function slideIt(x){
                let transform = Math.max(0,(Math.min(x,slider.offsetWidth)));
                before.style.width = transform+"px";
                resizer.style.left = transform-0+"px";
            }

            //stop divs being selected.
            function pauseEvent(e){
                if(e.stopPropagation) e.stopPropagation();
                if(e.preventDefault) e.preventDefault();
                e.cancelBubble=true;
                e.returnValue=false;
                return false;
            }

        }

    }

    beforeSlide();



    var previousScroll;
    var windowScroll = window.pageYOffset || document.documentElement.scrollTop;
    var scrollPosition;


    $(".header").removeClass("down")

    scrollPosition = window.scrollY || window.pageYOffset;
    if (scrollPosition > 100) {
        $(".header").addClass("header_down")
    }else {
        $(".header").removeClass("header_down")
    }


    $(window).scroll(function () {

        scrollPosition = window.scrollY || window.pageYOffset;

        if (scrollPosition > 100) {
            $(".header").addClass("header_down")
        }else {
            $(".header").removeClass("header_down")
        }


        if ($(".nav").hasClass('on')){
            return
        }

        var currentScroll = $(this).scrollTop();
        if (currentScroll > previousScroll) {
            if (scrollPosition > 10) {
                $(".header").addClass("down")
                $("body").addClass("down")
            }
        } else {
            $(".header").removeClass("down")
            $("body").removeClass("down")
        }
        previousScroll = currentScroll;
    });

    $(window).scroll(function () {
    });

    $("select").niceSelect()
    $('.nice-select').attr('data-lenis-prevent', ''); 

    let $illnesCurrent = $('#illness').next('.nice-select').find('.current');
    $illnesCurrent.html('상담내용<span class="required">*</span>');

    let $dateSelectCurrent = $('#dateSelect').next('.nice-select').find('.current');
    $dateSelectCurrent.html('희망 날짜<span class="required">*</span>');


    $('.sub_nav button').on('click', function(){
        $('.sub_nav button').not($(this)).removeClass('open')
        $(this).toggleClass('open')
    })



    $(".over_modal").click(function (e){
        var target = e.target;
        if ($(target).hasClass("scroll_box") || $(target).hasClass("over_modal") ) {
            overModalClose();
            lenis.start();
        }
    });

    //원 영역 그려지는 svg
    const ioSolution = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const $target = entry.target;
            if (entry.isIntersecting) {
                $target.classList.add("on");
            }
        });
    },{threshold: .2});

    const $itemsSolution = document.querySelectorAll(".sub_cont .cir_step_sect")
    $itemsSolution.forEach((item) => {
        ioSolution.observe(item);
    });

    //배너 애니메이션
    const ioBanner = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const $target = entry.target;
            if (entry.isIntersecting) {
                $target.classList.add("on");
            }
        });
    },{threshold: .2});

    const $itemsBanner = document.querySelectorAll(".sub_cont .online_banner")
    $itemsBanner.forEach((item) => {
        ioBanner.observe(item);
    });

    //good mind 원 애니메이션
    const ioMindCircle = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const $target = entry.target;
            if (entry.isIntersecting) {
                $target.classList.add("on");
            }
        });
    },{threshold: .2});

    const $itemsMindCircle = document.querySelectorAll(".sub_cont .mind_cir_sect")
    $itemsMindCircle.forEach((item) => {
        ioMindCircle.observe(item);
    });

    //그라데이션 배경 영역 텍스트 효과
    const ioGradient = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const $target = entry.target;
            if (entry.isIntersecting) {
                $target.classList.add("on");
            }
        });
    },{threshold: .2});

    const $itemsGradient = document.querySelectorAll(".sub_cont .gradient_sect")
    $itemsGradient.forEach((item) => {
        ioGradient.observe(item);
    });

    //mind 메인비주얼 이미지 효과
    const ioMindVisual = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const $target = entry.target;
            if (entry.isIntersecting) {
                $target.classList.add("on");
            }
        });
    },{threshold: .2});

    const $itemsMindVisual = document.querySelectorAll(".imgVisual .visual_sect")
    $itemsMindVisual.forEach((item) => {
        ioMindVisual.observe(item);
    });


    //진행과정 영역 효과
    if (window.innerWidth >= 768) {
        const ioProgress = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const $target = entry.target;
                if (entry.isIntersecting) {
                    $target.classList.add("on");
                }
            });
        }, { threshold: 0.2 });

        const $itemsProgress = document.querySelectorAll(".progress_sect")
        $itemsProgress.forEach((item) => {
            ioProgress.observe(item);
        });
    }


    //슬라이드 업 영역
    if (window.innerWidth >= 768) {
        const ioSlideUp = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const $target = entry.target;
                if (entry.isIntersecting) {
                    $target.classList.add("active");
                }
            });
        },{threshold: .2});

        const $itemsSlideUp = document.querySelectorAll(".slideUp_sect .cont_wrap .cont")
        $itemsSlideUp.forEach((item) => {
            ioSlideUp.observe(item);
        });
    }


    if(document.querySelector(".sub_im_after")) {


        console.log("SSS")

        let box = document.querySelectorAll(".sub_im_after .cont .box_wrap .box");
        let img = document.querySelectorAll(".sub_im_after .cont .image img");


        ScrollTrigger.matchMedia({
            "(min-width: 600px)": function () {

                box.forEach((cont, index) => {
                    let boxGsap = gsap.timeline({
                        scrollTrigger: {
                            trigger: cont,
                            start: "top center+=15%",
                            end: "bottom center",
                            scrub: true,
                            markers: false,
                            onEnter:()=>{
                                console.log("SOOOOOOS")
                                $(".sub_im_after .cont .box_wrap .box").removeClass("active")
                                $(".sub_im_after .cont .image img").removeClass("active")
                                $(cont).addClass("active")
                                $(img[index]).addClass("active")
                            },
                            onEnterBack:()=>{
                                $(".sub_im_after .cont .box_wrap .box").removeClass("active")
                                $(".sub_im_after .cont .image img").removeClass("active")
                                $(cont).addClass("active")
                                $(img[index]).addClass("active")
                            },
                            onLeaveBack: () => {
                                if (index === 0) {
                                    $(cont).removeClass("active");
                                }
                            }
                        }
                    });

                });


            },
            "(max-width: 600px)": function () {

                box.forEach((cont, index) => {
                    let boxGsap = gsap.timeline({
                        scrollTrigger: {
                            trigger: cont,
                            start: "top bottom-=160px",
                            end: "top center",
                            scrub: true,
                            markers: false,
                            onEnter:()=>{
                                $(".sub_im_after .cont .box_wrap .box").removeClass("active")
                                $(".sub_im_after .cont .image img").removeClass("active")
                                $(cont).addClass("active")
                                $(img[index]).addClass("active")
                            },
                            onEnterBack:()=>{
                                $(".sub_im_after .cont .box_wrap .box").removeClass("active")
                                $(".sub_im_after .cont .image img").removeClass("active")
                                $(cont).addClass("active")
                                $(img[index]).addClass("active")
                            },
                            onLeaveBack: () => {
                                if (index === 0) {
                                    $(cont).removeClass("active");
                                }
                            }
                        }
                    });

                });
            },
        });








    }


    if(document.querySelector(".sub_im_process .swiper")) {


        const imProcessSwiper = new Swiper('.sub_im_process .swiper', {
            // Swiper 설정
            loop: true, // 무한 반복
            navigation: {
                nextEl: '.sub_im_process .btn_next', // 다음 버튼
                prevEl: '.sub_im_process .btn_prev', // 이전 버튼
            },
            // 추가 옵션들 (필요에 따라 설정)
            slidesPerView: 1.4, // 한 번에 보일 슬라이드 수
            spaceBetween: 260, // 슬라이드 간격
            breakpoints: {
                // 화면의 넓이가 320px 이상일 때
                0: {
                    spaceBetween: 15,
                    slidesPerView: 1.3,
                    freeMode: {
                        enabled: true,
                        
                    },
                },
                640: {
                    spaceBetween: 20,
                    slidesPerView: 1.8
                },
                1000: {
                    spaceBetween: 60
                },
                1240: {
                    spaceBetween: 200
                },
            },
            on: {
                // Swiper 초기화가 끝난 후 실행됨
                init: function () {
                    // 약간의 delay 후에 refresh 하는 것도 좋음
                    setTimeout(() => {
                        ScrollTrigger.refresh();
                    }, 100);
                }
            }
        })
    }



    if(document.querySelector(".sub_im_qna ")) {


        $('.que').on('click', function () {
            const $question = $(this);
            const $btn = $question.find('.btn');
            const $answer = $question.next('.answer');
    
            $(this).toggleClass('active');
    
            $answer.stop(true, true).slideToggle(300).toggleClass('show');
        });

    }


    






    let footerGsap = gsap.timeline({
        scrollTrigger: {
            trigger: ".footer",
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
            markers: false,
            onEnter:()=>{
                $(".footer").addClass("active")                
            },

            onLeaveBack: () => {
                $(".footer").removeClass("active")                
            }
        }
    });





});




// ==observer==
function ComContObserver(selector, num, type, target2) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const $target = entry.target;
            const isIntersecting = entry.isIntersecting;

            if (isIntersecting) {
                if (target2) $(target2).addClass("active");
                $($target).addClass("active");
            } else if (type) {
                $($target).removeClass("active");
            }
        });
    }, { threshold: num });

    document.querySelectorAll(selector).forEach((item) => {
        observer.observe(item);
    });
}

// ComContObserver('.sub_tit_wrap', 0.6 , false);
// ComContObserver('.im_list_wrap', 0.5 , false);
// ComContObserver('.sub_im_qna ', 0.5 , false);
// ComContObserver('.story_system_sect .cont ', 0.2, false);
// ComContObserver('.sub_im_gall ', 0.2, false);
// ComContObserver('.sub_im .img', 0.5, false);


/* LSM 추가 */
ComContObserver('.main_tit_box', 0.5, false);
ComContObserver('.sub_tit_box', 0.5, false);
ComContObserver('.sub_tit', 0.5, false);

/* 공통 사용 */
ComContObserver('.system_sect .circles', 0.5, false);
ComContObserver('.promise_sect .cont .img_box', 0.1, false);

